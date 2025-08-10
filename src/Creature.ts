import {
  BakedJointBlueprint,
  BakedPartBlueprint,
  ICreature,
  IPart,
  JointAxisVec3,
  PartBlueprint,
  PartShape,
  RawAxisVec3,
  RootPart,
} from './@types'
import JoltType from 'jolt-physics'
import { Jolt, axisConfigs } from './utils/world'
import * as THREE from 'three'
import { Part } from './Part'
import {
  defaultPartBp,
  defaultJointBp,
} from './utils/defaults'
import { degToRad, getCenterOfMass } from './utils/math'
import {
  jointVec3ToThreeQuat,
  joltToThreeVec3,
} from './utils/vector'

export default class Creature implements ICreature {
  root: RootPart
  ragdoll: JoltType.Ragdoll
  parts: Record<string, IPart> = {}
  bodies: Record<string, JoltType.Body> = {}
  joints: Record<string, JoltType.SixDOFConstraint> = {}

  constructor({
    position,
    rotation,

    blueprint,
    physicsSystem,
    layer = 1,
  }: {
    position: Partial<RawAxisVec3>
    rotation: Partial<JointAxisVec3>
    blueprint: PartBlueprint
    physicsSystem: JoltType.PhysicsSystem
    layer?: number
  }) {
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
        if (!position || !rotation)
          throw new Error(
            'Root part must have position and rotation'
          )

        const { x: pX, y: pY, z: pZ } = position
        worldPosition.set(pX ?? 0, pY ?? 0, pZ ?? 0)

        worldRotation.copy(jointVec3ToThreeQuat(rotation))
      } else {
        const { joint: jointBp, size } = partBp

        if (!jointBp)
          throw new Error('Non-root part must have a joint')

        const { size: parentSize } = parentPartBp

        const bakedParentOffset = new THREE.Vector3()
        const bakedChildOffset = new THREE.Vector3()

        const { parentOffset, childOffset } = jointBp

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

        const bakedJointBp: BakedJointBlueprint = {
          ...defaultJointBp,
          ...jointBp,
          ...{
            factors: {
              ...defaultJointBp.factors,
              // inherited
              ...parentPartBp.joint?.factors,
              ...jointBp.factors,
            },
            torque: {
              ...defaultJointBp.torque,
              ...jointBp.torque,
            },
            zeroing: {
              ...defaultJointBp.zeroing,
              ...jointBp.zeroing,
            },
          },
          parentOffset: {
            ...parentOffset,
            baked: bakedParentOffset,
          },
          childOffset: {
            ...childOffset,
            baked: bakedChildOffset,
          },

          axis: jointBp.axis || {},
          mirror: jointBp.mirror || {},
          limits: jointBp.limits || {},

          rotation: new THREE.Quaternion(),
          yawAxis: new THREE.Vector3(),
          twistAxis: new THREE.Vector3(),
        }
        bakedPartBp.joint = bakedJointBp

        const {
          axis,
          mirror,
          rotation,
          yawAxis,
          twistAxis,
        } = bakedJointBp

        // Calculate joint rotation from the unprocessed axes
        //  Mirror some axes of the opposite side
        if (prefix == 'r_') {
          if (axis.y) axis.y *= -1
          if (axis.r) axis.r *= -1

          mirror.y = mirror.y ? false : true
          mirror.r = mirror.r ? false : true
        }
        rotation.copy(jointVec3ToThreeQuat(axis))

        // get processed joint axes from the rotation
        const matrix = new THREE.Matrix4()
        matrix.makeRotationFromQuaternion(rotation)

        yawAxis.setFromMatrixColumn(matrix, 2).normalize()
        twistAxis.setFromMatrixColumn(matrix, 1).normalize()

        // use joint and parentPart to calculate the world rotation
        worldRotation.copy(parentPartBp.worldRotation)
        worldRotation.multiply(rotation)

        parentPartBp.children!.push(bakedPartBp)

        if (symmetrical) prefix = 'l_'
        bakedPartBp.id = prefix + bakedPartBp.id
      }

      bakedPartBps.push(bakedPartBp)
      nameToIndex[bakedPartBp.id] = idx

      if (children) {
        children.forEach((child) => {
          bakePartBp(child, bakedPartBp, prefix)
        })
      }

      // bake the other opposite side
      if (symPartBp) {
        delete symPartBp.symmetrical

        const symJointBp = symPartBp.joint!

        const { parentOffset, childOffset } = symJointBp

        // mirror the axis offsets of the first opposite part
        if (parentOffset.w) parentOffset.w *= -1
        if (parentOffset.from?.w) parentOffset.from.w *= -1

        if (childOffset.w) childOffset.w *= -1
        if (childOffset.from?.w) childOffset.from.w *= -1

        bakePartBp(symPartBp, parentPartBp, 'r_')
      }

      return bakedPartBp
    }
    bakePartBp(blueprint)

    // Build skeleton
    const skeleton = new Jolt.Skeleton()
    for (let i = 0; i < bakedPartBps.length; ++i) {
      const part = bakedPartBps[i]
      const jName = new Jolt.JPHString(
        part.id,
        part.id.length
      )
      const parentPartIdx = part.parent
        ? nameToIndex[part.parent.id]
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

      switch (shapeType) {
        case PartShape.Sphere:
          shape = new Jolt.SphereShape(l)
          break
        case PartShape.Cylinder:
          shape = new Jolt.CylinderShape(l, t, 0)
          break
        case PartShape.Capsule:
          shape = new Jolt.CapsuleShape(l, t)
          break
        default:
          shape = new Jolt.BoxShape(new Jolt.Vec3(w, l, t))
          break
      }

      // apply properties
      const density =
        partBp.density ?? defaultPartBp.density
      shape.SetDensity(density)
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

      settingsPart.mMotionType = density
        ? Jolt.EMotionType_Dynamic
        : Jolt.EMotionType_Static

      settingsPart.mObjectLayer = layer
    }
    settings.Stabilize()

    settings.DisableParentChildCollisions()

    // Create ragdoll
    const ragdoll = (this.ragdoll = settings.CreateRagdoll(
      0,
      0,
      physicsSystem
    ))
    ragdoll.AddToPhysicsSystem(Jolt.EActivation_Activate)

    // Create the actual Parts
    const root = (this.root = new Part({
      physicsSystem,
      creature: this,
      bp: bakedPartBps[0],
    }))

    // Calculate torques from masses and torque
    const { parts } = this

    let sumMass = 0
    for (const name in parts) {
      const inverseMass = parts[name].physicsObj.inverseMass
      sumMass += inverseMass ? 1 / inverseMass : 0
    }

    this.setBaseTorques(sumMass, root, [])
  }

  private setBaseTorques(
    sumMass: number,
    part: IPart,
    toEndBodies: JoltType.Body[]
  ) {
    const { bodies } = this
    const { physicsObj, children, joint, bp } = part

    let otherBodies: JoltType.Body[] = []

    let toEndMass = physicsObj.inverseMass
      ? 1 / physicsObj.inverseMass
      : 0

    const { body } = physicsObj
    toEndBodies.push(body)

    // gather toEndBodies and recursively calculate
    if (children) {
      for (const name in children) {
        const child = children[name]
        const childToEndBodies: JoltType.Body[] = []
        toEndMass += this.setBaseTorques(
          sumMass,
          child,
          childToEndBodies
        )

        toEndBodies.push(...childToEndBodies)
      }
    }

    const jointBp = bp.joint
    if (joint && jointBp) {
      // determine other bodies
      otherBodies = Object.values(bodies)
      for (let i = 0; i < toEndBodies.length; i++) {
        otherBodies.splice(
          otherBodies.indexOf(toEndBodies[i]),
          1
        )
      }

      // use the mass and distances to calculate base torque
      let baseTorque = 0
      const jointPosition = joltToThreeVec3(
        body.GetPosition()
      ).add(jointBp.childOffset.baked)

      const {
        factors: {
          toEnd: toEndFactors,
          others: othersFactors,
        },
        torque: { max: maxTorque, min: minTorque },
      } = jointBp

      // calculate toEnd
      if (toEndFactors) {
        const toEndCoM = getCenterOfMass(toEndBodies)
        const toEndDistance = toEndCoM
          ? joltToThreeVec3(toEndCoM).distanceTo(
              jointPosition
            )
          : 0

        baseTorque +=
          toEndFactors * toEndMass * toEndDistance
      }

      // calculate others
      if (othersFactors) {
        const othersCoM = getCenterOfMass(otherBodies)
        const othersDistance = othersCoM
          ? joltToThreeVec3(othersCoM).distanceTo(
              jointPosition
            )
          : 0

        baseTorque +=
          othersFactors *
          (sumMass - toEndMass) *
          othersDistance
      }

      if (baseTorque) {
        joint.baseTorque = baseTorque

        joint.maxTorque = baseTorque * maxTorque
        joint.minTorque =
          baseTorque * (minTorque ?? -maxTorque)
      }
    }

    return toEndMass
  }
}
