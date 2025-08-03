import {
  Jolt,
  axisConfigs,
  jointAxisConfigs,
} from './world'
import JoltType from 'jolt-physics'
import * as THREE from 'three'
import {
  degToRad,
  quaternionFromYPR,
  toThreeVec3,
} from './math'
import {
  BakedPartBlueprint,
  PartBlueprint,
  BakedJointBlueprint,
  BuildResult,
  Part,
  RootPart,
  JointBlueprintDefaults,
  PartBlueprintDefaults,
  PartShape,
  RootPartBlueprint,
  JoltBody,
} from './types'

export const defaultPartBp: PartBlueprintDefaults = {
  color: 0x888888,
  density: 985,
  friction: 0.5,
  restitution: 0.1,
}

export const defaultJointBp: JointBlueprintDefaults = {
  maxTorque: 0.8,
  torqueFloor: 0.1,

  targetVelocity: 10,

  centeringFraction: 0.1,
  centeringStart: 0.5,
  centeringExponent: 3,
}

export function buildRagdollFromBlueprint(
  rootPartBp: RootPartBlueprint,
  physicsSystem: JoltType.PhysicsSystem,
  layer: number = 1
): BuildResult {
  // Prepare fixed axes
  const mAxisX2 = new Jolt.Vec3(0, 1, 0)
  const mAxisY2 = new Jolt.Vec3(0, 0, 1)

  // Deeply clone the blueprint and process, applying world transforms
  const bakedPartBps: BakedPartBlueprint[] = []
  const nameToIndex: Record<string, number> = {}

  function bakePartBp(
    partBp: PartBlueprint,
    parentPartBp?: BakedPartBlueprint,
    prefix = ''
  ) {
    const { children, symmetrical, size } = partBp

    // if symmetrical, create a copy for the right side
    let symPartBp: PartBlueprint | undefined
    if (symmetrical) {
      symPartBp = JSON.parse(
        JSON.stringify(partBp)
      ) as PartBlueprint
    }

    const l = size.l / 2
    const w = (size.w ?? 0) / 2 || l
    const t = (size.t ?? 0) / 2 || w

    const bakedPartBp: BakedPartBlueprint = {
      ...defaultPartBp,
      ...partBp,
      idx: bakedPartBps.length,

      parent: parentPartBp,
      children: [],

      hSize: { l, w, t },

      worldPosition: new THREE.Vector3(),
      worldRotation: new THREE.Quaternion(),

      joint: undefined,
    }

    const { idx, worldPosition, worldRotation } =
      bakedPartBp

    if (!parentPartBp) {
      const { position, rotation } =
        partBp as RootPartBlueprint
      if (!position || !rotation)
        throw new Error(
          'Root part must have position and rotation'
        )

      const { x: pX, y: pY, z: pZ } = position
      worldPosition.set(pX ?? 0, pY ?? 0, pZ ?? 0)

      const { y: rY, p: rP, r: rR } = rotation
      worldRotation.copy(quaternionFromYPR(rY, rP, rR))
    } else {
      const { joint, size } = partBp

      if (!joint)
        throw new Error('Non-root part must have a joint')

      const { size: parentSize } = parentPartBp

      const bakedParentOffset = new THREE.Vector3()
      const bakedChildOffset = new THREE.Vector3()

      const { parentOffset, childOffset } = joint

      // calculate baked offsets
      axisConfigs.forEach((config) => {
        const { rawAxis, partAxis } = config

        bakedParentOffset[rawAxis] =
          (parentOffset[partAxis] ?? 0) +
          (parentOffset.from?.[partAxis] ?? 0) *
            0.5 *
            (parentSize[partAxis] ?? 0)

        bakedChildOffset[rawAxis] =
          (childOffset[partAxis] ?? 0) +
          (childOffset.from?.[partAxis] ?? 0) *
            0.5 *
            (size[partAxis] ?? 0)
      })

      const bakedJoint: BakedJointBlueprint = {
        ...defaultJointBp,
        ...joint,
        parentOffset: {
          ...parentOffset,
          baked: bakedParentOffset,
        },
        childOffset: {
          ...childOffset,
          baked: bakedChildOffset,
        },

        axis: joint.axis || {},
        limits: joint.limits || {},

        rotation: new THREE.Quaternion(),
        yawAxis: new THREE.Vector3(),
        twistAxis: new THREE.Vector3(),
      }
      bakedPartBp.joint = bakedJoint

      const { axis, rotation, yawAxis, twistAxis } =
        bakedJoint

      // Calculate joint rotation from the unprocessed axes
      const { y, p, r } = axis
      rotation.copy(
        quaternionFromYPR(y ?? 0, p ?? 0, r ?? 0)
      )

      // get processed joint axes from the rotation
      const matrix = new THREE.Matrix4()
      matrix.makeRotationFromQuaternion(rotation)

      yawAxis.setFromMatrixColumn(matrix, 2).normalize()
      twistAxis.setFromMatrixColumn(matrix, 1).normalize()

      // use joint and parentPart to calculate the world rotation
      worldRotation.copy(parentPartBp.worldRotation)
      worldRotation.multiply(rotation)

      parentPartBp.children!.push(bakedPartBp)

      if (symmetrical) prefix = 'l-'
      bakedPartBp.name = prefix + bakedPartBp.name
    }

    bakedPartBps.push(bakedPartBp)
    nameToIndex[bakedPartBp.name] = idx

    if (children) {
      children.forEach((child) => {
        bakePartBp(child, bakedPartBp, prefix)
      })
    }

    if (symPartBp) {
      delete symPartBp.symmetrical

      const symJointBp = symPartBp.joint!

      const { parentOffset, childOffset, axis } = symJointBp

      if (parentOffset.w) parentOffset.w *= -1
      if (parentOffset.from?.w) parentOffset.from.w *= -1

      if (childOffset.w) childOffset.w *= -1
      if (childOffset.from?.w) childOffset.from.w *= -1

      if (axis?.y) axis.y *= -1
      if (axis?.r) axis.r *= -1

      bakePartBp(symPartBp, parentPartBp, 'r-')
    }

    return bakedPartBp
  }
  bakePartBp(rootPartBp)

  // Build skeleton
  const skeleton = new Jolt.Skeleton()
  for (let i = 0; i < bakedPartBps.length; ++i) {
    const part = bakedPartBps[i]
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
  settings.mParts.resize(bakedPartBps.length)
  for (let i = 0; i < bakedPartBps.length; ++i) {
    const partBp = bakedPartBps[i]
    const settingsPart = settings.mParts.at(i)

    const {
      shape: shapeType,
      hSize: { l, w, t },
      size,
    } = partBp

    let shape: JoltType.ConvexShape

    const roundingR = Math.min(w, l, t, size.r ?? 0)
    switch (shapeType) {
      case PartShape.Sphere:
        shape = new Jolt.SphereShape(l)
        break
      case PartShape.Cylinder:
        shape = new Jolt.CylinderShape(l, t, roundingR)
        break
      case PartShape.Capsule:
        shape = new Jolt.CapsuleShape(l, t)
        break
      default:
        shape = new Jolt.BoxShape(
          new Jolt.Vec3(w, l, t),
          roundingR
        )
        break
    }

    // apply properties
    shape.SetDensity(
      partBp.density ?? defaultPartBp.density
    )
    settingsPart.mFriction =
      partBp.friction ?? defaultPartBp.friction
    settingsPart.mRestitution =
      partBp.restitution ?? defaultPartBp.restitution

    settingsPart.SetShape(shape)
    settingsPart.mRotation = new Jolt.Quat(
      ...partBp.worldRotation.toArray()
    )

    const { parent } = partBp

    // if root
    if (!parent) {
      const { x, y, z } = partBp.worldPosition!
      settingsPart.mPosition = new Jolt.RVec3(
        x ?? 0,
        y ?? 0,
        z ?? 0
      )
    } else {
      // calculate world position of joint to this part
      refObject.quaternion.copy(partBp.worldRotation)
      refObject.position.set(0, 0, 0)
      const bakedChildOffset =
        partBp.joint!.childOffset.baked
      const jointPositionToPart = refObject.localToWorld(
        bakedChildOffset.clone()
      )

      // calculate world position of joint to parentPart
      refObject.quaternion.copy(parent.worldRotation)
      refObject.position.copy(parent.worldPosition)
      const bakedParentOffset =
        partBp.joint!.parentOffset.baked
      const jointPositionToParentPart =
        refObject.localToWorld(bakedParentOffset.clone())

      // set position to the difference
      partBp.worldPosition.copy(
        jointPositionToParentPart.sub(jointPositionToPart)
      )

      settingsPart.mPosition = new Jolt.RVec3(
        ...partBp.worldPosition.toArray()
      )

      const jointSettings = (settingsPart.mToParent =
        new Jolt.SixDOFConstraintSettings())

      // set space to local
      jointSettings.mSpace =
        Jolt.EConstraintSpace_LocalToBodyCOM

      // fix unneeded axes
      jointSettings.MakeFixedAxis(
        Jolt.SixDOFConstraintSettings_EAxis_TranslationX
      )
      jointSettings.MakeFixedAxis(
        Jolt.SixDOFConstraintSettings_EAxis_TranslationY
      )
      jointSettings.MakeFixedAxis(
        Jolt.SixDOFConstraintSettings_EAxis_TranslationZ
      )

      // Assign all properties, converting arrays to Jolt vectors as needed
      const jointBp = partBp.joint!
      jointSettings.mPosition1 = new Jolt.RVec3(
        ...bakedParentOffset.toArray()
      )
      jointSettings.mPosition2 = new Jolt.RVec3(
        ...bakedChildOffset.toArray()
      )

      // Set Axes
      jointSettings.mAxisX1 = new Jolt.Vec3(
        ...jointBp.twistAxis.toArray()
      )
      jointSettings.mAxisX2 = mAxisX2

      jointSettings.mAxisY1 = new Jolt.Vec3(
        ...jointBp.yawAxis.toArray()
      )
      jointSettings.mAxisY2 = mAxisY2

      // Set limits
      jointSettings.mSwingType = JoltType.ESwingType_Cone

      for (const config of axisConfigs) {
        const { joltAxis, jointAxis } = config
        const limit = jointBp.limits[jointAxis]

        if (limit) {
          jointSettings.SetLimitedAxis(
            joltAxis,
            jointAxis == 'r' ? -degToRad(limit) : 0,
            degToRad(limit)
          )
        } else {
          jointSettings.MakeFixedAxis(joltAxis)
        }
      }
    }

    settingsPart.mMotionType = Jolt.EMotionType_Dynamic
    // TEMP, lock the root position
    // if (!parent)
    //   settingsPart.mMotionType = Jolt.EMotionType_Static

    settingsPart.mObjectLayer = layer
  }
  settings.Stabilize()
  // settings.DisableParentChildCollisions()

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
  const joints: Record<string, JoltType.SixDOFConstraint> =
    {}

  const creatureId = rootPartBp.id

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
      size,
    } = partBp

    const id = creatureId + '-' + name

    const body = physicsSystem
      .GetBodyLockInterfaceNoLock()
      .TryGetBody(ragdoll.GetBodyID(idx))
    bodies[id] = body

    body.GetMotionProperties().SetAngularDamping(10)

    const partBody = body as JoltBody

    const part: Part = {
      bp: partBp,
      id,
      body: partBody,
      vizRadius: 0,
      parent,

      torqueDir: { y: 0, p: 0, r: 0 },
      torque: { y: 0, p: 0, r: 0 },
      lambda: { y: 0, p: 0, r: 0 },

      contacts: [],
    }

    partBody.getPart = () => part

    // set radius to be used in visualizations
    switch (partBp.shape) {
      case PartShape.Sphere:
      case PartShape.Cylinder:
      case PartShape.Capsule:
        part.vizRadius = size.w ?? size.l
        break
      default:
        part.vizRadius =
          Math.max(size.w ?? 0, size.t ?? 0) ?? size.l
        break
    }

    parts[id] = part

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
  const creature = fillPart(bakedPartBps[0]) as RootPart

  return {
    creature,
    ragdoll,
    parts,
    bodies,
    joints,
  }
}
