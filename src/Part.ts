import { Obj3d } from './Obj3d'
import { ICreature, IJoint, IPart } from './@types'
import { BakedPartBlueprint } from './@types/blueprint'
import * as THREE from 'three'
import { joltToThreeQuat } from './utils/vector'
import { degToRad, lerp, scale } from './utils/math'
import { axisConfigs } from './constants/axes'
import CreatureWorld from './CreatureWorld'

export class Part extends Obj3d implements IPart {
  creature: ICreature

  bp: BakedPartBlueprint
  id: string

  children?: Record<string, IPart>
  // Only for non-root parts
  parent?: IPart

  joint?: IJoint

  constructor({
    creature,
    bp,
    parent,
  }: {
    creature: ICreature
    bp: BakedPartBlueprint
    parent?: IPart
  }) {
    super(
      CreatureWorld.physicsSystem
        .GetBodyLockInterfaceNoLock()
        .TryGetBody(creature.ragdoll.GetBodyID(bp.idx))
    )

    this.creature = creature
    this.parent = parent

    const { ragdoll, parts, bodies, joints } = creature

    const {
      idx,
      id,
      joint: jointBP,
      children: childBps,
    } = bp

    this.bp = bp
    this.id = id

    const { body } = this
    bodies[id] = body
    parts[id] = this

    body.GetMotionProperties().SetAngularDamping(10)

    const { Jolt } = CreatureWorld

    if (jointBP) {
      const joint = Jolt.castObject(
        ragdoll.GetConstraint(idx - 1),
        Jolt.SixDOFConstraint
      )
      joints[id] = joint

      axisConfigs.forEach((config) => {
        const { joltAxis, jointAxis } = config
        joint.SetMotorState(
          joltAxis,
          jointBP.limits[jointAxis]
            ? Jolt.EMotorState_Velocity
            : Jolt.EMotorState_Off
        )
      })

      this.joint = {
        bp: jointBP,

        part: this,
        joint,

        baseTorque: 0,
        minTorque: 0,
        maxTorque: 0,

        deviation: { y: 0, p: 0, r: 0 },
        torqueDirection: { y: 0, p: 0, r: 0 },
        torque: { y: 0, p: 0, r: 0 },
        lambda: { y: 0, p: 0, r: 0 },
      }
    }

    if (childBps) {
      const children = (this.children = {})
      childBps.forEach((childBp) => {
        children[childBp.id] = new Part({
          creature,
          bp: childBp,
          parent: this,
        })
      })
    }
  }

  update(): void {
    super.update()

    const velocity = new THREE.Vector3()

    const { joint, bp, creature, children } = this
    const { Jolt, physicsSystem } = CreatureWorld
    const bodyInterface = physicsSystem.GetBodyInterface()

    if (joint) {
      const {
        maxTorque,
        minTorque,
        deviation: deviations,
        torqueDirection,
        torque,
        lambda,
        joint: joltJoint,
      } = joint

      const jointBp = bp.joint!
      const {
        torque: { floor: torqueFloor },
        mirror,
        limits,

        maxVelocity,

        zeroing: {
          frac: zeroingFraction,
          start: zeroingStart,
          exp: zeroingExponent,
        },
      } = jointBp

      // Get relative rotation
      const relativeRotationQuat =
        joltJoint.GetRotationInConstraintSpace()
      const relativeRotation =
        new THREE.Euler().setFromQuaternion(
          joltToThreeQuat(relativeRotationQuat),
          'YZX'
        )
      Jolt.destroy(relativeRotationQuat)

      // Reset velocity
      velocity.set(0, 0, 0)

      // Get joint limits (in degrees)
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

        let axisMultiplier = torqueDirection[jointAxis]
        // if mirrored, mirror the direction
        if (mirror?.[jointAxis])
          axisMultiplier = -axisMultiplier as any

        const settings =
          joltJoint.GetMotorSettings(joltAxis)

        const maxTorqueFloor = maxTorque * torqueFloor
        settings.set_mMaxTorqueLimit(maxTorqueFloor)
        const minTorqueFloor = minTorque * torqueFloor
        settings.set_mMinTorqueLimit(minTorqueFloor)

        // get scaled angle to limits,
        // with 0 for at the center, -1 at one limit and 1 at the other
        const deviation = (deviations[jointAxis] =
          relativeRotation[torqueAxis] / degToRad(limit))

        let centeringMultiplier = 0
        if (deviation) {
          centeringMultiplier = scale(
            0,
            1,
            zeroingStart,
            1,
            Math.abs(deviation),
            true
          )
          centeringMultiplier = Math.max(
            0,
            centeringMultiplier
          )

          centeringMultiplier **= zeroingExponent
          centeringMultiplier *= zeroingFraction
          // centeringMultiplier *= 0

          if (deviation < 0)
            centeringMultiplier = -centeringMultiplier
        }

        const sumMultiplier =
          axisMultiplier - centeringMultiplier

        torque[jointAxis] = sumMultiplier

        let targetVelocityA = maxVelocity

        if (sumMultiplier > 0) {
          settings.set_mMaxTorqueLimit(
            lerp(maxTorqueFloor, maxTorque, sumMultiplier)
          )
        } else if (sumMultiplier < 0) {
          settings.set_mMinTorqueLimit(
            lerp(minTorqueFloor, minTorque, -sumMultiplier)
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

    if (children)
      for (const id in children) children[id].update()
  }

  applyDown(cb: (part: IPart) => void): void {
    cb(this)
    const { children } = this
    if (children)
      for (const id in children) children[id].applyDown(cb)
  }
}
