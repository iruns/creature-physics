import type JoltType from 'jolt-physics'

/** Init this class so the Jolt and Jolt variables can be easily
 * accessed by the other codes */
export default class CreatureWorld {
  static Jolt: typeof JoltType
  static physicsSystem: JoltType.PhysicsSystem
  static bodyInterface: JoltType.BodyInterface

  static init(
    Jolt: typeof JoltType,
    physicsSystem: JoltType.PhysicsSystem,
    bodyInterface: JoltType.BodyInterface
  ) {
    CreatureWorld.Jolt = Jolt
    CreatureWorld.physicsSystem = physicsSystem
    CreatureWorld.bodyInterface = bodyInterface
  }
}
