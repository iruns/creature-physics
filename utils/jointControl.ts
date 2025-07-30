import { defaultJointBp } from './creatureBuilder'
import {
  degToRad,
  exponentiate,
  scale,
  toThreeQuat,
  toThreeVec3,
  weakenBy,
} from './math'
import {
  Axis,
  axisConfigs,
  Part,
  RSet,
  YPSet,
} from './types'
import { bodyInterface, Jolt, joltAxes } from './world'
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

    axisConfigs.forEach(({ label, rAxis }) => {
      if (!limits[rAxis]) return

      const axisDiv = jointDiv.appendChild(
        document.createElement('div')
      )
      axisDiv.style.display = 'flex'
      axisDiv.style.alignItems = 'center'
      axisDiv.style.marginBottom = '4px'
      axisDiv.style.gap = '8px'
      axisDiv.style.width = '100%'

      // Left button
      const leftButton = axisDiv.appendChild(
        document.createElement('button')
      )
      leftButton.textContent = '<'
      leftButton.style.flex = '0 0 auto'

      leftButton.onmousedown = () =>
        (part.torque[rAxis] = -1)
      leftButton.onmouseup = leftButton.onmouseleave = () =>
        (part.torque[rAxis] = 0)

      // Axis label (centered)
      const labelDiv = axisDiv.appendChild(
        document.createElement('span')
      )
      labelDiv.textContent = label
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
        (part.torque[rAxis] = 1)
      rightButton.onmouseup = rightButton.onmouseleave =
        () => (part.torque[rAxis] = 0)
    })
  }
}

export function updateJointTorques(
  parts: Record<string, Part>
) {
  for (const name in parts) {
    const { joint, torque, bp, body, parent } = parts[name]
    if (!joint) continue

    const jointBP = bp.joint!
    const maxTorque =
      jointBP.maxTorque ?? defaultJointBp.maxTorque
    const minTorque = jointBP.minTorque ?? maxTorque
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
    // swap x and z
    const tempX = euler.x
    euler.x = euler.z
    euler.z = tempX

    // Get joint limits (in degrees)
    const limits = jointBP.limits

    const velocityArray: [number, number, number] = [
      0, 0, 0,
    ]

    for (let a = 0; a < axisConfigs.length; a++) {
      const { rAxis, axis, idx } = axisConfigs[a]

      const limit = limits[rAxis]
      if (!limit) continue

      const axisTorque = torque[rAxis]

      const joltAxis = joltAxes[axis]
      const settings = joint.GetMotorSettings(joltAxis)

      settings.set_mMaxTorqueLimit(0)
      settings.set_mMinTorqueLimit(0)

      // get scaled angle to limits,
      // with 0 for at the center, -1 at one limit and 1 at the other
      const scaledAngle = euler[axis] / degToRad(limit)
      let centeringTorque = 0
      if (scaledAngle) {
        centeringTorque = scale(
          0,
          1,
          0.75,
          1,
          Math.abs(scaledAngle),
          true
        )
        centeringTorque = Math.max(0, centeringTorque)

        centeringTorque **= 2
        centeringTorque *= maxTorque * 0.01

        if (scaledAngle > 0)
          centeringTorque = -centeringTorque
      }

      // const sumTorque = axisTorque
      const sumTorque = axisTorque - centeringTorque

      let motorState = Jolt.EMotorState_Velocity
      let targetVelocityA = targetVelocity
      if (sumTorque > 0) {
        settings.set_mMaxTorqueLimit(sumTorque * maxTorque)
      } else if (sumTorque < 0) {
        settings.set_mMinTorqueLimit(sumTorque * minTorque)
        targetVelocityA = -targetVelocityA
      } else {
        targetVelocityA = 0
        motorState = Jolt.EMotorState_Off
      }

      velocityArray[idx] = targetVelocityA
      joint.SetMotorState(joltAxis, motorState)
    }

    const velocityVec3 = new Jolt.Vec3(...velocityArray)

    // Apply the torque to the joint
    joint.SetTargetAngularVelocityCS(velocityVec3)

    Jolt.destroy(velocityVec3)
  }
}
