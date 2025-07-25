import type JoltType from 'jolt-physics'

let jolt: JoltType.JoltInterface
export let Jolt: typeof JoltType
export let physicsSystem: JoltType.PhysicsSystem
export let bodyInterface: JoltType.BodyInterface

export function initWorld(JoltArg: typeof JoltType) {
  Jolt = JoltArg

  // Physics
  const settings = new Jolt.JoltSettings()
  settings.mMaxWorkerThreads = 3

  setupCollisionFiltering(settings)

  jolt = new Jolt.JoltInterface(settings)
  Jolt.destroy(settings)
  physicsSystem = jolt.GetPhysicsSystem()
  bodyInterface = physicsSystem.GetBodyInterface()
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
