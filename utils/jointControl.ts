import { radToDeg } from 'three/src/math/MathUtils.js'
import { defaultJointBp } from './creatureBuilder'
import {
  degToRad,
  lerp,
  scale,
  toThreeQuat,
  toThreeVec3,
} from './math'
import { Part, RSet, YPSet } from './types'
import { Jolt, axisConfigs, rawAxisConfigs } from './world'
import * as THREE from 'three'

// Store per-part torques to be applied each frame
// Change: Part.torques is Record<string, THREE.Vector3>
export function createJointControls(
  parts: Record<string, Part>
) {
  let panel = document.getElementById(
    'joint-motor-panel'
  ) as HTMLDivElement | null
  if (!panel) {
    panel = document.createElement('div')
    panel.id = 'joint-motor-panel'
    panel.style.position = 'absolute'
    panel.style.top = '10px'
    panel.style.right = '10px'
    panel.style.background = 'rgba(255,255,255,0.95)'
    panel.style.padding = '12px'
    panel.style.borderRadius = '8px'
    panel.style.zIndex = '1000'
    panel.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
    panel.style.maxWidth = '320px'
    panel.style.fontFamily = 'sans-serif'
    document.body.appendChild(panel)
  } else {
    panel.innerHTML = ''
  }

  for (const name in parts) {
    const part = parts[name]
    const parent = part.parent!
    const joint = part.joint!
    if (!parent || !joint) continue

    const jointDiv = panel.appendChild(
      document.createElement('div')
    )
    jointDiv.style.marginBottom = '10px'
    jointDiv.innerHTML = `<div style="margin-bottom:2px;"><b>${name}</b></div>`

    const limits = part.bp.joint!.limits as YPSet & RSet

    axisConfigs.forEach(({ jointLabel, jointAxis }) => {
      if (!limits[jointAxis]) return

      const axisDiv = jointDiv.appendChild(
        document.createElement('div')
      )
      axisDiv.style.display = 'flex'
      axisDiv.style.alignItems = 'center'
      axisDiv.style.marginBottom = '4px'
      axisDiv.style.gap = '8px'
      axisDiv.style.width = '100%'

      const torque = part.torqueDir

      // Left button
      const leftButton = axisDiv.appendChild(
        document.createElement('button')
      )
      leftButton.textContent = '<'
      leftButton.style.flex = '0 0 auto'

      leftButton.onmousedown = () =>
        (torque[jointAxis] = -1)
      leftButton.onmouseup = leftButton.onmouseleave = () =>
        (torque[jointAxis] = 0)

      // Axis label (centered)
      const labelDiv = axisDiv.appendChild(
        document.createElement('span')
      )
      labelDiv.textContent = jointLabel
      labelDiv.style.flex = '1 1 auto'
      labelDiv.style.textAlign = 'center'
      labelDiv.style.fontWeight = 'bold'

      // Right button
      const rightButton = axisDiv.appendChild(
        document.createElement('button')
      )
      rightButton.textContent = '>'
      rightButton.style.flex = '0 0 auto'

      rightButton.onmousedown = () =>
        (torque[jointAxis] = 1)
      rightButton.onmouseup = rightButton.onmouseleave =
        () => (torque[jointAxis] = 0)
    })
  }
}

export function updateJointTorques(
  parts: Record<string, Part>
) {
  for (const name in parts) {
    const { joint, torqueDir, torque, bp, body, parent } =
      parts[name]
    if (!joint) continue

    const jointBP = bp.joint!
    const maxTorque =
      jointBP.maxTorque ?? defaultJointBp.maxTorque
    const minTorque = jointBP.minTorque ?? -maxTorque
    let targetVelocity =
      jointBP.targetVelocity ??
      defaultJointBp.targetVelocity

    const parentBody = parent!.body

    // --- Relative rotation scaled to constraint frame ---
    // Get world quaternions
    const qChild = toThreeQuat(body.GetRotation())
    const qParent = toThreeQuat(parentBody.GetRotation())

    // Convert joint reference rotation (THREE.Quaternion)
    const jointRefLocal =
      bp.joint?.rotation?.clone() ?? new THREE.Quaternion()

    // The joint's reference orientation in world space is jointRefLocal * qParent
    const jointRefQuat = jointRefLocal.multiply(qParent)

    // Relative rotation: q_rel = q_jointRef^-1 * q_child
    const qRel = jointRefQuat
      .clone()
      .invert()
      .multiply(qChild)

    // Convert to Euler angles (in radians)
    const euler = new THREE.Euler().setFromQuaternion(
      qRel,
      'YZX'
    )

    // Get joint limits (in degrees)
    const limits = jointBP.limits as YPSet & RSet

    const velocityArray: [number, number, number] = [
      0, 0, 0,
    ]

    for (let a = 0; a < axisConfigs.length; a++) {
      const { jointAxis, rawAxis, joltAxis, torqueIdx } =
        axisConfigs[a]

      const limit = limits[jointAxis] ?? 0
      if (!limit) continue

      const axisDir = torqueDir[jointAxis]
      const settings = joint.GetMotorSettings(joltAxis)

      const torqueFloor = 0.5
      const maxTorqueFloor = maxTorque * torqueFloor
      settings.set_mMaxTorqueLimit(maxTorqueFloor)
      const minTorqueFloor = minTorque * torqueFloor
      settings.set_mMinTorqueLimit(minTorqueFloor)

      // get scaled angle to limits,
      // with 0 for at the center, -1 at one limit and 1 at the other
      const scaledAngle = euler[rawAxis] / degToRad(limit)

      let centeringScale = 0
      if (scaledAngle) {
        centeringScale = scale(
          0,
          1,
          0.66,
          1,
          Math.abs(scaledAngle),
          true
        )
        centeringScale = Math.max(0, centeringScale)

        centeringScale **= 3
        centeringScale *= 0.1

        if (scaledAngle < 0)
          centeringScale = -centeringScale
      }

      // const sumScale = axisDir
      const sumScale = axisDir - centeringScale
      torque[jointAxis] = sumScale

      let targetVelocityA = targetVelocity

      if (sumScale > 0) {
        settings.set_mMaxTorqueLimit(
          lerp(maxTorqueFloor, maxTorque, sumScale)
        )
      } else if (sumScale < 0) {
        settings.set_mMinTorqueLimit(
          lerp(minTorqueFloor, minTorque, sumScale)
        )
        targetVelocityA = -targetVelocityA
      } else {
        targetVelocityA = 0
      }

      velocityArray[torqueIdx] = targetVelocityA
    }

    const velocityVec3 = new Jolt.Vec3(...velocityArray)

    // Apply the torque to the joint
    joint.SetTargetAngularVelocityCS(velocityVec3)

    Jolt.destroy(velocityVec3)
  }
}
