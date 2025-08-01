import type JoltType from 'jolt-physics'
import {
  AxisConfig,
  JointAxis,
  PartAxis,
  RawAxis,
} from './types'

let jolt: JoltType.JoltInterface
export let Jolt: typeof JoltType
export let physicsSystem: JoltType.PhysicsSystem
export let bodyInterface: JoltType.BodyInterface

export const axisConfigs: AxisConfig[] = [
  {
    torqueIdx: 1,
    rawAxis: 'z',
    partLabel: 'Thickness',
    partAxis: 't',
    jointLabel: 'Yaw',
    jointAxis: 'y',
    joltAxis: 0,
  },
  {
    torqueIdx: 2,
    rawAxis: 'x',
    partLabel: 'Width',
    partAxis: 'w',
    jointLabel: 'Pitch',
    jointAxis: 'p',
    joltAxis: 0,
  },
  {
    torqueIdx: 0,
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

  physicsSystem.SetGravity(new Jolt.Vec3(0, 0, 0))

  const physicsSettings = physicsSystem.GetPhysicsSettings()
  physicsSettings.mAllowSleeping = false
  // physicsSettings.mPointVelocitySleepThreshold = 1e-4
  // physicsSettings.mTimeBeforeSleep = 10
}

export const LAYER_NON_MOVING = 0
export const LAYER_MOVING = 1
export const NUM_OBJECT_LAYERS = 2

const setupCollisionFiltering = function (
  settings: JoltType.JoltSettings
) {
  const objectFilter = new Jolt.ObjectLayerPairFilterTable(
    NUM_OBJECT_LAYERS
  )
  objectFilter.EnableCollision(
    LAYER_NON_MOVING,
    LAYER_MOVING
  )
  objectFilter.EnableCollision(LAYER_MOVING, LAYER_MOVING)

  const BP_LAYER_NON_MOVING = new Jolt.BroadPhaseLayer(0)
  const BP_LAYER_MOVING = new Jolt.BroadPhaseLayer(1)
  const NUM_BROAD_PHASE_LAYERS = 2
  const bpInterface =
    new Jolt.BroadPhaseLayerInterfaceTable(
      NUM_OBJECT_LAYERS,
      NUM_BROAD_PHASE_LAYERS
    )
  bpInterface.MapObjectToBroadPhaseLayer(
    LAYER_NON_MOVING,
    BP_LAYER_NON_MOVING
  )
  bpInterface.MapObjectToBroadPhaseLayer(
    LAYER_MOVING,
    BP_LAYER_MOVING
  )

  settings.mObjectLayerPairFilter = objectFilter
  settings.mBroadPhaseLayerInterface = bpInterface
  settings.mObjectVsBroadPhaseLayerFilter =
    new Jolt.ObjectVsBroadPhaseLayerFilterTable(
      settings.mBroadPhaseLayerInterface,
      NUM_BROAD_PHASE_LAYERS,
      settings.mObjectLayerPairFilter,
      NUM_OBJECT_LAYERS
    )

  // For minimal?
  // const objectFilter = new Jolt.ObjectLayerPairFilterTable(
  //   2
  // )
  // objectFilter.EnableCollision(0, 1)
  // objectFilter.EnableCollision(1, 1)
  // const bpInterface =
  //   new Jolt.BroadPhaseLayerInterfaceTable(2, 2)
  // bpInterface.MapObjectToBroadPhaseLayer(
  //   0,
  //   new Jolt.BroadPhaseLayer(0)
  // )
  // bpInterface.MapObjectToBroadPhaseLayer(
  //   1,
  //   new Jolt.BroadPhaseLayer(1)
  // )
  // settings.mObjectLayerPairFilter = objectFilter
  // settings.mBroadPhaseLayerInterface = bpInterface
  // settings.mObjectVsBroadPhaseLayerFilter =
  //   new Jolt.ObjectVsBroadPhaseLayerFilterTable(
  //     settings.mBroadPhaseLayerInterface,
  //     2,
  //     settings.mObjectLayerPairFilter,
  //     2
  //   )
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
    LAYER_NON_MOVING
  )
  const body = bodyInterface.CreateBody(creationSettings)
  Jolt.destroy(creationSettings)
  bodyInterface.AddBody(
    body.GetID(),
    Jolt.EActivation_Activate
  )
  return body
}

export function updatePhysics(deltaTime: number) {
  const numSteps = deltaTime > 1.0 / 55.0 ? 2 : 1
  jolt.Step(deltaTime, numSteps)
}
