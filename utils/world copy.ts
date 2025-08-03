import type JoltType from 'jolt-physics'
import {
  AxisConfig,
  JointAxis,
  Part,
  PartAxis,
  JoltBody,
  RawAxis,
  Contact,
} from './types'
import { toPartVec3, toScaledPartVec3 } from './math'

let jolt: JoltType.JoltInterface
export let Jolt: typeof JoltType
export let physicsSystem: JoltType.PhysicsSystem
export let bodyInterface: JoltType.BodyInterface

export const axisConfigs: AxisConfig[] = [
  {
    torqueAxis: 'y',
    rawAxis: 'z',
    partLabel: 'Thickness',
    partAxis: 't',
    jointLabel: 'Yaw',
    jointAxis: 'y',
    joltAxis: 0,
  },
  {
    torqueAxis: 'z',
    rawAxis: 'x',
    partLabel: 'Width',
    partAxis: 'w',
    jointLabel: 'Pitch',
    jointAxis: 'p',
    joltAxis: 0,
  },
  {
    torqueAxis: 'x',
    rawAxis: 'y',
    partLabel: 'Length',
    partAxis: 'l',
    jointLabel: 'Roll',
    jointAxis: 'r',
    joltAxis: 0,
  },
]
export const rawAxisConfigs = {} as Record<
  RawAxis,
  AxisConfig
>
export const partAxisConfigs = {} as Record<
  PartAxis,
  AxisConfig
>
export const jointAxisConfigs = {} as Record<
  JointAxis,
  AxisConfig
>
export const joltAxisConfigs = {} as Record<
  JoltType.SixDOFConstraintSettings_EAxis,
  AxisConfig
>

export function initWorld(JoltArg: typeof JoltType) {
  Jolt = JoltArg

  // Physics
  const settings = new Jolt.JoltSettings()
  settings.mMaxWorkerThreads = 3

  setupCollisionFiltering(settings)

  jolt = new Jolt.JoltInterface(settings)
  Jolt.destroy(settings)

  axisConfigs.forEach((config) => {
    rawAxisConfigs[config.rawAxis] = config
    partAxisConfigs[config.partAxis] = config
    jointAxisConfigs[config.jointAxis] = config
    joltAxisConfigs[config.joltAxis] = config
  })
  rawAxisConfigs.x.joltAxis =
    Jolt.SixDOFConstraintSettings_EAxis_RotationX
  rawAxisConfigs.y.joltAxis =
    Jolt.SixDOFConstraintSettings_EAxis_RotationY
  rawAxisConfigs.z.joltAxis =
    Jolt.SixDOFConstraintSettings_EAxis_RotationZ

  jointAxisConfigs.p.joltAxis =
    Jolt.SixDOFConstraintSettings_EAxis_RotationZ
  jointAxisConfigs.y.joltAxis =
    Jolt.SixDOFConstraintSettings_EAxis_RotationY
  jointAxisConfigs.r.joltAxis =
    Jolt.SixDOFConstraintSettings_EAxis_RotationX

  physicsSystem = jolt.GetPhysicsSystem()
  bodyInterface = physicsSystem.GetBodyInterface()

  // setupContactListeners(physicsSystem)

  // physicsSystem.SetGravity(new Jolt.Vec3(0, 0, 0))

  const physicsSettings = physicsSystem.GetPhysicsSettings()
  // physicsSettings.mAllowSleeping = false
  physicsSettings.mPointVelocitySleepThreshold = 1e-4
  physicsSettings.mTimeBeforeSleep = 10
}

const setupCollisionFiltering = function (
  settings: JoltType.JoltSettings
) {
  const objectFilter = new Jolt.ObjectLayerPairFilterTable(
    2
  )
  objectFilter.EnableCollision(0, 1)
  objectFilter.EnableCollision(1, 1)
  const bpInterface =
    new Jolt.BroadPhaseLayerInterfaceTable(2, 2)
  bpInterface.MapObjectToBroadPhaseLayer(
    0,
    new Jolt.BroadPhaseLayer(0)
  )
  bpInterface.MapObjectToBroadPhaseLayer(
    1,
    new Jolt.BroadPhaseLayer(1)
  )
  settings.mObjectLayerPairFilter = objectFilter
  settings.mBroadPhaseLayerInterface = bpInterface
  settings.mObjectVsBroadPhaseLayerFilter =
    new Jolt.ObjectVsBroadPhaseLayerFilterTable(
      settings.mBroadPhaseLayerInterface,
      2,
      settings.mObjectLayerPairFilter,
      2
    )
}

const setupContactListeners = function (
  physicsSystem: JoltType.PhysicsSystem
) {
  // Register contact listener
  const contactListener = new Jolt.ContactListenerJS()
  contactListener.OnContactValidate = (
    body1Pointer,
    body2Pointer,
    baseOffset,
    collideShapeResultPointer
  ) => {
    const body1 = Jolt.wrapPointer(body1Pointer, Jolt.Body)
    const body2 = Jolt.wrapPointer(body2Pointer, Jolt.Body)

    const collideShapeResult = Jolt.wrapPointer(
      collideShapeResultPointer,
      Jolt.CollideShapeResult
    )

    // collisionLog.value +=
    //   'OnContactValidate ' +
    //   body1Pointer.GetID().GetIndex() +
    //   ' ' +
    //   body2Pointer.GetID().GetIndex() +
    //   ' ' +
    //   collideShapeResult.mPenetrationAxis.ToString() +
    //   '\n'
    return Jolt.ValidateResult_AcceptAllContactsForThisBodyPair
  }
  contactListener.OnContactAdded = (
    body1Pointer,
    body2Pointer,
    manifoldPointer,
    settingsPointer
  ) => {
    const body1 = Jolt.wrapPointer(body1Pointer, Jolt.Body)
    const body2 = Jolt.wrapPointer(body2Pointer, Jolt.Body)

    const part1 = (body1 as JoltBody)?.getPart()
    const part2 = (body2 as JoltBody)?.getPart()

    if (!part1 && !part2) return

    const manifold = Jolt.wrapPointer(
      manifoldPointer,
      Jolt.ContactManifold
    )

    // const strength = manifold.
    // Jolt.EstimateCollisionResponse
    const settings = Jolt.wrapPointer(
      settingsPointer,
      Jolt.ContactSettings
    )

    const strength = 0
    // const contact: Contact = {
    //   position: {x: }
    // }

    const pointsOn1 =
      manifold.get_mRelativeContactPointsOn1()
    const pointsOn2 =
      manifold.get_mRelativeContactPointsOn2()

    console.log(part1?.id, part2?.id)

    //     let i = 0
    //     // while (true) {
    //     for (let x = 0; x < 5; x++) {
    //       try {
    //         const pointOn1 = pointsOn1.at(i)
    //         if (!pointsOn1 || !pointOn1.Length()) break
    //         const pointOn2 = pointsOn2.at(i)
    //         if (!pointsOn2 || !pointOn2.Length()) break
    //
    //         console.log('\t', i)
    //         if (part1)
    //           console.log(toScaledPartVec3(pointOn1, part1))
    //         if (part2)
    //           console.log(toScaledPartVec3(pointOn1, part2))
    //         // part1.contacts.push
    //
    //         i++
    //       } finally {
    //         break
    //       }
    //     }

    // collisionLog.value +=
    //   'OnContactAdded ' +
    //   body1.GetID().GetIndex() +
    //   ' ' +
    //   body2.GetID().GetIndex() +
    //   ' ' +
    //   manifold.mWorldSpaceNormal.ToString() +
    //   '\n'
  }
  contactListener.OnContactPersisted = (
    body1Pointer,
    body2Pointer,
    manifoldPointer,
    settingsPointer
  ) => {
    const body1 = Jolt.wrapPointer(body1Pointer, Jolt.Body)
    const body2 = Jolt.wrapPointer(body2Pointer, Jolt.Body)

    const part1 = (body1 as JoltBody)?.getPart()
    const part2 = (body2 as JoltBody)?.getPart()

    if (!part1 && part2) return

    // console.log('\t', part1.id, part2.id)

    const manifold = Jolt.wrapPointer(
      manifoldPointer,
      Jolt.ContactManifold
    )
    const settings = Jolt.wrapPointer(
      settingsPointer,
      Jolt.ContactSettings
    )

    // collisionLog.value +=
    //   'OnContactPersisted ' +
    //   body1.GetID().GetIndex() +
    //   ' ' +
    //   body2.GetID().GetIndex() +
    //   ' ' +
    //   manifold.mWorldSpaceNormal.ToString() +
    //   '\n'
  }
  contactListener.OnContactRemoved = (
    subShapePairPointer
  ) => {
    const subShapePair = Jolt.wrapPointer(
      subShapePairPointer,
      Jolt.SubShapeIDPair
    )
    // collisionLog.value +=
    //   'OnContactRemoved ' +
    //   subShapePair.GetBody1ID().GetIndex() +
    //   ' ' +
    //   subShapePair.GetBody2ID().GetIndex() +
    //   '\n'
  }

  physicsSystem.SetContactListener(contactListener)
}

export function createFloor(size = 2) {
  const shape = new Jolt.BoxShape(
    new Jolt.Vec3(size, 0.5, size),
    0.05,
    undefined
  )
  const creationSettings = new Jolt.BodyCreationSettings(
    shape,
    new Jolt.RVec3(0, -0.5, 0),
    new Jolt.Quat(0, 0, 0, 1),
    Jolt.EMotionType_Static,
    0
  )

  const body = bodyInterface.CreateBody(creationSettings)
  Jolt.destroy(creationSettings)
  bodyInterface.AddBody(
    body.GetID(),
    Jolt.EActivation_Activate
  )
  return body
}

export function updatePhysics(
  deltaTime: number,
  parts?: Record<string, Part>
) {
  const numSteps = deltaTime > 1.0 / 55.0 ? 2 : 1

  // pre step
  if (parts) {
    for (const id in parts) {
      const part = parts[id]
      const { joint, contacts } = part

      // joint
      if (joint) {
        // apply torque
        //
      }

      // contact
      //  empty
      contacts.length = 0
    }
  }

  jolt.Step(deltaTime, numSteps)

  // post step
  if (parts) {
    for (const id in parts) {
      const part = parts[id]
      const { joint, contacts } = part

      // joint
      if (joint) {
        // get rotation
        // get motor lambdas
      }
    }
  }
}
