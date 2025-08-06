import type JoltType from 'jolt-physics'
import {
  AxisConfig,
  JointAxis,
  Part,
  PartAxis,
  RawAxis,
  RawAxisVec3,
  UserData,
} from './types'
import {
  setupCollisionFiltering,
  setupContactListeners,
} from './contacts'
import { toRawVec3 } from './math'

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

  setupContactListeners(physicsSystem)

  // physicsSystem.SetGravity(new Jolt.Vec3(0, 0, 0))

  const physicsSettings = physicsSystem.GetPhysicsSettings()
  // physicsSettings.mAllowSleeping = false
  // physicsSettings.mPointVelocitySleepThreshold = 1e-4
  // physicsSettings.mTimeBeforeSleep = 10
}

const userDataSets: UserData[] = []

export function watchBody(body: JoltType.Body): UserData {
  const idx = userDataSets.length
  const userData: UserData = {
    body,
    linearVelocity: new Jolt!.Vec3(0, 0, 0),
    angularVelocity: new Jolt!.Vec3(0, 0, 0),
  }
  userDataSets.push(userData)
  body.SetUserData(idx)

  return userData
}

export function getUserData(body: JoltType.Body) {
  return userDataSets[body.GetUserData()]
}

export function createBox(
  size: RawAxisVec3,
  position: RawAxisVec3,
  isStatic?: boolean
): JoltType.Body {
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

  watchBody(body)

  return body
}

export function createFloor(size = 2) {
  return createBox(
    { x: size, y: 0.5, z: size },
    { x: 0, y: -0.5, z: 0 },
    true
  )
}

let t = 0
export function updatePhysics(
  parts: Record<string, Part>,
  deltaTime: number
) {
  const numSteps = deltaTime > 1.0 / 55.0 ? 2 : 1

  console.log('-----', t)

  for (let i = 0; i < userDataSets.length; i++) {
    const userData = userDataSets[i]

    const body = userData.body

    const linearVelocity = body.GetLinearVelocity()
    userData.linearVelocity.Set(
      linearVelocity.GetX(),
      linearVelocity.GetY(),
      linearVelocity.GetZ()
    )

    const angularVelocity = body.GetAngularVelocity()
    userData.angularVelocity.Set(
      angularVelocity.GetX(),
      angularVelocity.GetY(),
      angularVelocity.GetZ()
    )
  }

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

  t++
}
