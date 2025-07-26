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

  const axisConfigs: { label: string; axis: number }[] = [
    { label: 'Yaw', axis: 1 },
    { label: 'Pitch', axis: 0 },
    { label: 'Roll', axis: 2 },
  ]

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
      // leftButton.style.marginRight = '0'

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
  for (const name in parts) {
    const { joint, torque, bp, body, parent } = parts[name]
    if (!joint) continue

    const jointBP = bp.joint!
    const maxTorque =
      jointBP.maxTorque ?? defaultJointBp.maxTorque
    const minTorque = jointBP.minTorque ?? maxTorque
    const targetVelocity =
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
    const yprLimits = jointBP.yprLimits

    // Scale each axis to [-1, 1] based on limits, do not clamp
    const rel = [
      yprLimits[0]
        ? euler.y / THREE.MathUtils.degToRad(yprLimits[0])
        : 0,
      yprLimits[1]
        ? euler.x / THREE.MathUtils.degToRad(yprLimits[1])
        : 0,
      yprLimits[2]
        ? euler.z / THREE.MathUtils.degToRad(yprLimits[2])
        : 0,
    ]

    // rel[0]: yaw, rel[1]: pitch, rel[2]: roll, un-clamped
    // You can use rel[] for feedback or visualization

    const swingSettings = joint.GetSwingMotorSettings()
    const twistSettings = joint.GetTwistMotorSettings()

    let swingVelocity = 0

    const swingTorque = torque[0]
    swingSettings.set_mMaxTorqueLimit(0)
    swingSettings.set_mMinTorqueLimit(0)

    joint.SetSwingMotorState(Jolt.EMotorState_Velocity)
    joint.SetTwistMotorState(Jolt.EMotorState_Velocity)

    const centerringSwingTorque = weakenBy(
      exponentiate(rel[1], 5),
      0.6
    )

    // const sumTorque = swingTorque
    const sumTorque = swingTorque - centerringSwingTorque

    if (sumTorque > 0) {
      swingSettings.set_mMaxTorqueLimit(
        sumTorque * maxTorque
      )
      swingVelocity = targetVelocity
    } else if (sumTorque < 0) {
      swingSettings.set_mMinTorqueLimit(
        sumTorque * minTorque
      )
      swingVelocity = -targetVelocity
    } else {
      joint.SetSwingMotorState(Jolt.EMotorState_Off)
      joint.SetTwistMotorState(Jolt.EMotorState_Off)
    }

    // Apply the torque to the joint
    joint.SetTargetAngularVelocityCS(
      // new Jolt.Vec3(0, 0, 1)
      new Jolt.Vec3(0, 0, swingVelocity)
    )

    // console.log(
    //   toThreeVec3(joint.GetTotalLambdaMotor()).toArray()
    // )
  }
}
