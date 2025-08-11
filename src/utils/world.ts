import type JoltType from 'jolt-physics'
import { RawAxisVec3, IObj3D } from '../@types'
import { Obj3d } from '../Obj3d'

let jolt: JoltType.JoltInterface
export let Jolt: typeof JoltType
export let physicsSystem: JoltType.PhysicsSystem
export let bodyInterface: JoltType.BodyInterface

export function initWorld(JoltArg: typeof JoltType) {
  Jolt = JoltArg

  // Physics
  const settings = new Jolt.JoltSettings()
  settings.mMaxWorkerThreads = 3

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

  jolt = new Jolt.JoltInterface(settings)
  Jolt.destroy(settings)

  physicsSystem = jolt.GetPhysicsSystem()
  bodyInterface = physicsSystem.GetBodyInterface()

  physicsSystem.SetGravity(new Jolt.Vec3(0, 0, 0))

  const physicsSettings = physicsSystem.GetPhysicsSettings()
  // physicsSettings.mAllowSleeping = false
  // physicsSettings.mPointVelocitySleepThreshold = 1e-4
  // physicsSettings.mTimeBeforeSleep = 10
}

const userDataSets: IObj3D[] = []

export function addObj3d(obj3d: IObj3D) {
  userDataSets.push(obj3d)
  const idx = userDataSets.length
  obj3d.body.SetUserData(idx)
}

export function getUserData(body: JoltType.Body) {
  return userDataSets[body.GetUserData()]
}

export function createBox(
  size: RawAxisVec3,
  position: RawAxisVec3,
  isStatic?: boolean
): IObj3D {
  const shape = new Jolt.BoxShape(
    new Jolt.Vec3(size.x, size.y, size.z),
    0.05,
    undefined
  )
  shape.SetDensity(1000)
  const creationSettings = new Jolt.BodyCreationSettings(
    shape,
    new Jolt.RVec3(position.x, position.y, position.z),
    new Jolt.Quat(0, 0, 0, 1),
    isStatic
      ? Jolt.EMotionType_Static
      : Jolt.EMotionType_Dynamic,
    isStatic ? 0 : 1
  )

  const body = bodyInterface.CreateBody(creationSettings)
  Jolt.destroy(creationSettings)
  bodyInterface.AddBody(
    body.GetID(),
    Jolt.EActivation_Activate
  )

  const obj3d = new Obj3d(body)
  addObj3d(obj3d)

  return obj3d
}

export function createFloor(size = 2): IObj3D {
  return createBox(
    { x: size, y: 0.5, z: size },
    { x: 0, y: -0.5, z: 0 },
    true
  )
}

let t = 0
export function updatePhysics(deltaTime: number) {
  const numSteps = deltaTime > 1.0 / 55.0 ? 2 : 1

  // console.log('-----', t)

  jolt.Step(deltaTime, numSteps)

  t++
}
