import { defaultJointBp } from './creatureBuilder'
import {
  exponentiate,
  toThreeQuat,
  toThreeVec3,
  weakenBy,
} from './math'
import { Part } from './types'
import { bodyInterface, Jolt } from './world'
import * as THREE from 'three'

const axisConfigs: { label: string; axis: number }[] = [
  { label: 'Yaw', axis: 1 },
  { label: 'Pitch', axis: 2 },
  // { label: 'Roll', axis: 0 },
]

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

    axisConfigs.forEach(({ label, axis }) => {
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
        (part.torque[axis] = -1)
      leftButton.onmouseup = leftButton.onmouseleave = () =>
        (part.torque[axis] = 0)

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
        (part.torque[axis] = 1)
      rightButton.onmouseup = rightButton.onmouseleave =
        () => (part.torque[axis] = 0)
    })
  }
}

export function updateJointTorques(
  parts: Record<string, Part>
) {
  const axes = [
    Jolt.SixDOFConstraintSettings_EAxis_RotationX,
    Jolt.SixDOFConstraintSettings_EAxis_RotationY,
    Jolt.SixDOFConstraintSettings_EAxis_RotationZ,
  ]

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
      'YXZ'
    )

    // Get joint limits (in degrees)
    const ypLimits = jointBP.ypLimits

    // Scale each axis to [-1, 1] based on limits, do not clamp
    const rel = [
      ypLimits[0]
        ? euler.y / THREE.MathUtils.degToRad(ypLimits[0])
        : 0,
      ypLimits[1]
        ? euler.x / THREE.MathUtils.degToRad(ypLimits[1])
        : 0,
    ]

    // rel[0]: yaw, rel[1]: pitch, rel[2]: roll, un-clamped
    // You can use rel[] for feedback or visualization

    let velocity = 0
    const velocityArray: [number, number, number] = [
      0, 0, 0,
    ]

    for (let a = 0; a < axisConfigs.length; a++) {
      const { axis } = axisConfigs[a]
      const axisTorque = torque[axis]

      const joltAxis = axes[axis]
      const settings = joint.GetMotorSettings(joltAxis)

      settings.set_mMaxTorqueLimit(0)
      settings.set_mMinTorqueLimit(0)

      const centerringSwingTorque = weakenBy(
        exponentiate(rel[a], 5),
        0.6
      )

      const sumTorque = axisTorque
      // const sumTorque = swingTorque - centerringSwingTorque

      let motorState = Jolt.EMotorState_Velocity
      if (sumTorque > 0) {
        settings.set_mMaxTorqueLimit(sumTorque * maxTorque)
      } else if (sumTorque < 0) {
        settings.set_mMinTorqueLimit(sumTorque * minTorque)
        targetVelocity = -targetVelocity
      } else {
        motorState = Jolt.EMotorState_Off
      }

      velocityArray[axis] = targetVelocity
      joint.SetMotorState(joltAxis, motorState)
    }

    const velocityVec3 = new Jolt.Vec3(...velocityArray)

    // Apply the torque to the joint
    joint.SetTargetAngularVelocityCS(velocityVec3)

    Jolt.destroy(velocityVec3)
  }
}
