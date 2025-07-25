// Intuitive blueprint-based ragdoll/body builder for JoltPhysics
import type JoltType from 'jolt-physics'
import { Jolt } from './world'
import {
  degToRad,
  quaternionFromYPR,
  rotateByAxis,
} from './math'
import * as THREE from 'three'

export interface PartBlueprint {
  name: string
  shape: JoltType.Shape
  children?: PartBlueprint[]
  // Only root part has position/rotation
  position?: [number, number, number]
  yprRotation?: [number, number, number]
  // Only for non-root parts
  joint?: JointBlueprint
}

export interface ProcessedPartBlueprint
  extends PartBlueprint {
  parent?: ProcessedPartBlueprint

  worldPosition: THREE.Vector3
  worldRotation: THREE.Quaternion

  joint?: ProcessedJointBlueprint
}

export interface JointBlueprint {
  positionA: [number, number, number] // Anchor in parent local space
  positionB: [number, number, number] // Anchor in child local space
  yprAxes: [number, number, number] // Yaw, pitch, roll axes in parent local space
  yprLimits: [number, number, number] // Yaw, pitch, roll angles in degrees
}

export interface ProcessedJointBlueprint
  extends JointBlueprint {
  rotation: THREE.Quaternion
  twistAxis: THREE.Vector3
  planeAxis: THREE.Vector3
}

export interface BuildResult {
  processedBlueprint: ProcessedPartBlueprint[]
  ragdoll: JoltType.Ragdoll | null
  bodies: Record<string, JoltType.Body>
  joints: Record<string, JoltType.SwingTwistConstraint>
}

export function buildRagdollFromBlueprint(
  Jolt: typeof JoltType,
  blueprint: PartBlueprint,
  physicsSystem: JoltType.PhysicsSystem,
  layer: number = 1
): BuildResult {
  // Prepare fixed axes
  const mTwistAxis2 = new Jolt.Vec3(0, 0, 1)
  const mPlaneAxis2 = new Jolt.Vec3(1, 0, 0)

  // Deeply clone the blueprint and process, applying world transforms
  const processedBlueprint: ProcessedPartBlueprint[] = []
  const nameToIndex: Record<string, number> = {}

  function process(
    part: PartBlueprint,
    parent?: ProcessedPartBlueprint
  ) {
    const processedJoint:
      | ProcessedJointBlueprint
      | undefined = part.joint
      ? {
          ...part.joint,
          rotation: new THREE.Quaternion(),
          twistAxis: new THREE.Vector3(),
          planeAxis: new THREE.Vector3(),
        }
      : undefined

    const processedPart: ProcessedPartBlueprint = {
      ...part,
      parent,
      joint: processedJoint,
      worldPosition: new THREE.Vector3(),
      worldRotation: new THREE.Quaternion(),
    }

    const { joint, worldPosition, worldRotation } =
      processedPart

    if (!parent) {
      if (!part.position || !part.yprRotation)
        throw new Error(
          'Root part must have position and rotation'
        )
      worldPosition.fromArray(part.position)
      worldRotation.copy(
        quaternionFromYPR(...part.yprRotation)
      )
    } else {
      if (!joint)
        throw new Error('Non-root part must have a joint')

      const { yprAxes, rotation, twistAxis, planeAxis } =
        joint

      // Calculate joint rotation from the unprocessed axes
      rotation.copy(quaternionFromYPR(...yprAxes))

      // get processed joint axes from the rotation
      const matrix = new THREE.Matrix4()
      matrix.makeRotationFromQuaternion(rotation)

      twistAxis.setFromMatrixColumn(matrix, 2).normalize()
      planeAxis.setFromMatrixColumn(matrix, 1).normalize()

      // use joit and parent to calculate the world rotation
      worldRotation.copy(rotation)
      worldRotation.multiply(parent.worldRotation)
    }
    // console.log(part.name, worldRotation)

    const idx = processedBlueprint.length
    processedBlueprint.push(processedPart)
    nameToIndex[processedPart.name] = idx

    if (part.children) {
      for (const child of part.children)
        process(child, processedPart)
    }
  }
  process(blueprint)

  // Build skeleton
  const skeleton = new Jolt.Skeleton()
  for (let i = 0; i < processedBlueprint.length; ++i) {
    const part = processedBlueprint[i]
    const jName = new Jolt.JPHString(
      part.name,
      part.name.length
    )
    const parentIdx = part.parent
      ? nameToIndex[part.parent.name]
      : 0
    skeleton.AddJoint(jName, parentIdx)
    Jolt.destroy(jName)
  }

  // Build ragdoll settings
  const refObject = new THREE.Object3D()
  const settings = new Jolt.RagdollSettings()
  settings.mSkeleton = skeleton
  settings.mParts.resize(processedBlueprint.length)
  for (let i = 0; i < processedBlueprint.length; ++i) {
    const part = processedBlueprint[i]
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
        new THREE.Vector3(...part.joint!.positionB)
      )

      // calculate world position of joint to parent
      refObject.quaternion.copy(parent.worldRotation)
      refObject.position.copy(parent.worldPosition)
      const jointPositionToParent = refObject.localToWorld(
        new THREE.Vector3(...part.joint!.positionA)
      )

      // set position to the difference
      part.worldPosition.copy(
        jointPositionToParent.sub(jointPositionToPart)
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
        ...joint.positionA
      )
      constraint.mPosition2 = new Jolt.RVec3(
        ...joint.positionB
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
  const bodies: Record<string, JoltType.Body> = {}
  const joints: Record<
    string,
    JoltType.SwingTwistConstraint
  > = {}
  for (let i = 0; i < processedBlueprint.length; ++i) {
    const part = processedBlueprint[i]
    const partName = part.name
    const bodyID = ragdoll.GetBodyID(i)
    const body = physicsSystem
      .GetBodyLockInterfaceNoLock()
      .TryGetBody(bodyID)
    bodies[partName] = body
    if (i > 0 && part.joint) {
      const constraint = Jolt.castObject(
        ragdoll.GetConstraint(i - 1),
        Jolt.SwingTwistConstraint
      )
      joints[partName] = constraint
      constraint.SetSwingMotorState(
        Jolt.EMotorState_Velocity
      )
      constraint.SetTwistMotorState(
        Jolt.EMotorState_Velocity
      )
      // constraint.SetTargetAngularVelocityCS(
      //   new Jolt.Vec3(1, 0, 0)
      //   // new Jolt.Vec3(0, -1, 0)
      //   // new Jolt.Vec3(0, 0, 1)
      // )
    }
  }
  return { processedBlueprint, ragdoll, bodies, joints }
}
