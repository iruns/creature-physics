import { radToDeg } from 'three/src/math/MathUtils.js'
import { degToRad, lerp, scale, toThreeQuat } from './math'
import { Part } from './types'
import { Jolt, axisConfigs, bodyInterface } from './world'
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

    const limits = part.bp.joint!.limits

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

      const { torqueDirection } = joint

      // Left button
      const leftButton = axisDiv.appendChild(
        document.createElement('button')
      )
      leftButton.textContent = '<'
      leftButton.style.flex = '0 0 auto'

      leftButton.onmousedown = () =>
        (torqueDirection[jointAxis] = -1)
      leftButton.onmouseup = leftButton.onmouseleave = () =>
        (torqueDirection[jointAxis] = 0)

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
        (torqueDirection[jointAxis] = 1)
      rightButton.onmouseup = rightButton.onmouseleave =
        () => (torqueDirection[jointAxis] = 0)
    })
  }
}

export function updateJointTorques(
  parts: Record<string, Part>
) {
  const velocity = new THREE.Vector3()

  for (const name in parts) {
    const { joint, bp } = parts[name]

    if (!joint) continue

    const {
      torqueDirection,
      torque,
      lambda,
      joint: joltJoint,
    } = joint

    const jointBP = bp.joint!
    const {
      maxTorque,
      minTorque = -maxTorque,
      torqueFloor,

      targetVelocity,

      centeringFraction,
      centeringStart,
      centeringExponent,
    } = jointBP

    // Get relative rotation
    const relativeRotationQuat =
      joltJoint.GetRotationInConstraintSpace()
    const relativeRotation =
      new THREE.Euler().setFromQuaternion(
        toThreeQuat(relativeRotationQuat),
        'YZX'
      )
    Jolt.destroy(relativeRotationQuat)

    // Reset velocity
    velocity.set(0, 0, 0)

    // Get joint limits (in degrees)
    const limits = jointBP.limits

    const lambdaValues =
      joltJoint.GetTotalLambdaMotorRotation()
    lambda.y = -lambdaValues.GetY()
    lambda.p = -lambdaValues.GetZ()
    lambda.r = -lambdaValues.GetX()

    Jolt.destroy(lambdaValues)

    for (let a = 0; a < axisConfigs.length; a++) {
      const { jointAxis, joltAxis, torqueAxis } =
        axisConfigs[a]

      const limit = limits[jointAxis] ?? 0
      if (!limit) continue

      const axisDir = torqueDirection[jointAxis]

      const settings = joltJoint.GetMotorSettings(joltAxis)

      const maxTorqueFloor = maxTorque * torqueFloor
      settings.set_mMaxTorqueLimit(maxTorqueFloor)
      const minTorqueFloor = minTorque * torqueFloor
      settings.set_mMinTorqueLimit(minTorqueFloor)

      // get scaled angle to limits,
      // with 0 for at the center, -1 at one limit and 1 at the other
      const scaledAngle =
        relativeRotation[torqueAxis] / degToRad(limit)

      let centeringScale = 0
      if (scaledAngle) {
        centeringScale = scale(
          0,
          1,
          centeringStart,
          1,
          Math.abs(scaledAngle),
          true
        )
        centeringScale = Math.max(0, centeringScale)

        centeringScale **= centeringExponent
        centeringScale *= centeringFraction
        // centeringScale *= 0

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
          lerp(minTorqueFloor, minTorque, -sumScale)
        )
        targetVelocityA = -targetVelocityA
      } else {
        targetVelocityA = 0
      }

      velocity[torqueAxis] = targetVelocityA
    }

    // Apply the torque to the joint
    if (!joltJoint.IsActive())
      bodyInterface.ActivateConstraint(joltJoint)

    const velocityVec3 = new Jolt.Vec3(
      ...velocity.toArray()
    )
    joltJoint.SetTargetAngularVelocityCS(velocityVec3)

    Jolt.destroy(velocityVec3)
  }
}
