import { Jolt } from './world'
import type JoltType from 'jolt-physics'
import * as THREE from 'three'
import { degToRad, quaternionFromYPR } from './math'
import {
  BakedPartBlueprint,
  PartBlueprint,
  BakedJointBlueprint,
  BuildResult,
  Part,
  RootPart,
} from './types'

export function buildRagdollFromBlueprint(
  blueprint: PartBlueprint,
  physicsSystem: JoltType.PhysicsSystem,
  layer: number = 1
): BuildResult {
  // Prepare fixed axes
  const mTwistAxis2 = new Jolt.Vec3(0, 0, 1)
  const mPlaneAxis2 = new Jolt.Vec3(1, 0, 0)

  // Deeply clone the blueprint and process, applying world transforms
  const processedPartBlueprints: BakedPartBlueprint[] = []
  const nameToIndex: Record<string, number> = {}

  function bakePartBp(
    partBp: PartBlueprint,
    parentPartBp?: BakedPartBlueprint
  ) {
    const { children } = partBp

    const bakedPartBp: BakedPartBlueprint = {
      ...partBp,
      idx: processedPartBlueprints.length,
      parent: parentPartBp,
      children: partBp.children as BakedPartBlueprint[],
      worldPosition: new THREE.Vector3(),
      worldRotation: new THREE.Quaternion(),
      joint: undefined,
    }

    const { idx, worldPosition, worldRotation } =
      bakedPartBp

    if (!parentPartBp) {
      if (!partBp.position || !partBp.yprRotation)
        throw new Error(
          'Root part must have position and rotation'
        )
      worldPosition.fromArray(partBp.position)
      worldRotation.copy(
        quaternionFromYPR(...partBp.yprRotation)
      )
    } else {
      const { joint } = partBp
      if (!joint)
        throw new Error('Non-root part must have a joint')

      const bakedJoint: BakedJointBlueprint = {
        ...joint,
        rotation: new THREE.Quaternion(),
        twistAxis: new THREE.Vector3(),
        planeAxis: new THREE.Vector3(),
      }

      bakedPartBp.joint = bakedJoint

      const { yprAxes, rotation, twistAxis, planeAxis } =
        bakedJoint

      // Calculate joint rotation from the unprocessed axes
      rotation.copy(quaternionFromYPR(...yprAxes))

      // get processed joint axes from the rotation
      const matrix = new THREE.Matrix4()
      matrix.makeRotationFromQuaternion(rotation)

      twistAxis.setFromMatrixColumn(matrix, 2).normalize()
      planeAxis.setFromMatrixColumn(matrix, 1).normalize()

      // use joint and parentPart to calculate the world rotation
      worldRotation.copy(rotation)
      worldRotation.multiply(parentPartBp.worldRotation)
    }

    processedPartBlueprints.push(bakedPartBp)
    nameToIndex[bakedPartBp.name] = idx

    if (children) {
      children.forEach((child, i) => {
        children[i] = bakePartBp(child, bakedPartBp)
      })
    }

    return bakedPartBp
  }
  // TODO clone deep the blueprint
  bakePartBp(blueprint)

  // Build skeleton
  const skeleton = new Jolt.Skeleton()
  for (let i = 0; i < processedPartBlueprints.length; ++i) {
    const part = processedPartBlueprints[i]
    const jName = new Jolt.JPHString(
      part.name,
      part.name.length
    )
    const parentPartIdx = part.parent
      ? nameToIndex[part.parent.name]
      : 0
    skeleton.AddJoint(jName, parentPartIdx)
    Jolt.destroy(jName)
  }

  // Build ragdoll settings
  const refObject = new THREE.Object3D()
  const settings = new Jolt.RagdollSettings()
  settings.mSkeleton = skeleton
  settings.mParts.resize(processedPartBlueprints.length)
  for (let i = 0; i < processedPartBlueprints.length; ++i) {
    const part = processedPartBlueprints[i]
    const settingsPart = settings.mParts.at(i)
    settingsPart.SetShape(part.shape)
    settingsPart.mRotation = new Jolt.Quat(
      ...part.worldRotation.toArray()
    )

    const { parent } = part

    // if root
    if (!parent) {
      settingsPart.mPosition = new Jolt.RVec3(
        ...(part.position || [0, 0, 0])
      )
    } else {
      // calculate world position of joint to this part
      refObject.quaternion.copy(part.worldRotation)
      refObject.position.set(0, 0, 0)
      const jointPositionToPart = refObject.localToWorld(
        new THREE.Vector3(...part.joint!.childOffset)
      )

      // calculate world position of joint to parentPart
      refObject.quaternion.copy(parent.worldRotation)
      refObject.position.copy(parent.worldPosition)
      const jointPositionToparentPart =
        refObject.localToWorld(
          new THREE.Vector3(...part.joint!.parentOffset)
        )

      // set position to the difference
      part.worldPosition.copy(
        jointPositionToparentPart.sub(jointPositionToPart)
      )
      settingsPart.mPosition = new Jolt.RVec3(
        ...part.worldPosition.toArray()
      )

      const constraint = (settingsPart.mToParent =
        new Jolt.SwingTwistConstraintSettings())
      // set space to local
      constraint.mSpace =
        Jolt.EConstraintSpace_LocalToBodyCOM

      // Assign all properties, converting arrays to Jolt vectors as needed
      const joint = part.joint!
      constraint.mPosition1 = new Jolt.RVec3(
        ...joint.parentOffset
      )
      constraint.mPosition2 = new Jolt.RVec3(
        ...joint.childOffset
      )

      constraint.mTwistAxis1 = new Jolt.Vec3(
        ...joint.twistAxis.toArray()
      )
      constraint.mTwistAxis2 = mTwistAxis2

      constraint.mPlaneAxis1 = new Jolt.Vec3(
        ...joint.planeAxis.toArray()
      )
      constraint.mPlaneAxis2 = mPlaneAxis2

      const rollAngle = joint.yprLimits[2]
      constraint.mTwistMinAngle = degToRad(-rollAngle - 90)
      constraint.mTwistMaxAngle = degToRad(rollAngle - 90)

      constraint.mNormalHalfConeAngle = degToRad(
        joint.yprLimits[0]
      )
      constraint.mPlaneHalfConeAngle = degToRad(
        joint.yprLimits[1]
      )

      constraint.mMaxFrictionTorque = 0.2
    }

    settingsPart.mMotionType = Jolt.EMotionType_Dynamic
    // TEMP, lock the root position
    if (!parent)
      settingsPart.mMotionType = Jolt.EMotionType_Static

    settingsPart.mObjectLayer = layer
  }
  settings.Stabilize()
  settings.DisableParentChildCollisions()

  // Create ragdoll
  const ragdoll = settings.CreateRagdoll(
    0,
    0,
    physicsSystem
  )
  ragdoll.AddToPhysicsSystem(Jolt.EActivation_Activate)

  // Map part names to bodies and joints
  const parts: Record<string, Part> = {}
  const bodies: Record<string, JoltType.Body> = {}
  const joints: Record<
    string,
    JoltType.SwingTwistConstraint
  > = {}

  // Create creature object
  function fillPart(
    partBp: BakedPartBlueprint,
    parent?: Part
  ) {
    const {
      idx,
      name,
      joint: jointBP,
      children: childrenBps,
    } = partBp

    const body = physicsSystem
      .GetBodyLockInterfaceNoLock()
      .TryGetBody(ragdoll.GetBodyID(idx))
    bodies[name] = body

    const part: Part = {
      bp: partBp,
      body,
      parent,
    }

    parts[name] = part

    if (jointBP) {
      const joint = Jolt.castObject(
        ragdoll.GetConstraint(idx - 1),
        Jolt.SwingTwistConstraint
      )
      joints[name] = joint
      joint.SetMaxFrictionTorque
      joint.SetSwingMotorState(Jolt.EMotorState_Off)
      joint.SetTwistMotorState(Jolt.EMotorState_Off)
      // joint.SetSwingMotorState(Jolt.EMotorState_Velocity)
      // joint.SetTwistMotorState(Jolt.EMotorState_Velocity)

      part.joint = joint
    }

    if (childrenBps) {
      const children = (part.children = {})
      childrenBps.forEach((childBp) => {
        children[childBp.name] = fillPart(childBp, part)
      })
    }

    return part
  }
  const creature = fillPart(
    processedPartBlueprints[0]
  ) as RootPart

  return {
    creature,
    ragdoll,
    parts,
    bodies,
    joints,
  }
}
