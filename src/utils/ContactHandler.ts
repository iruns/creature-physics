import type JoltType from 'jolt-physics'
import { joltToVec3, joltToScaledPartVec3 } from './vector'
import { IObj3D, IPart } from '../@types'

export default class ContactHandler {
  static obj3ds: IObj3D[] = []
  static addContactObj(obj3d: IObj3D) {
    ContactHandler.obj3ds[obj3d.body.GetID().GetIndex()] =
      obj3d
  }

  static init(
    Jolt: typeof JoltType,
    physicsSystem: JoltType.PhysicsSystem
  ) {
    // Register contact listener
    const contactListener = new Jolt.ContactListenerJS()

    contactListener.OnContactValidate = () =>
      Jolt.ValidateResult_AcceptAllContactsForThisBodyPair

    contactListener.OnContactAdded = (
      bodyAPointer,
      bodyBPointer,
      manifoldPointer
    ) => {
      // console.log('---added')

      ContactHandler.processContact(
        Jolt,
        bodyAPointer,
        bodyBPointer,
        manifoldPointer
      )
    }

    contactListener.OnContactPersisted = (
      bodyAPointer,
      bodyBPointer,
      manifoldPointer
    ) => {
      // console.log('---persist')

      ContactHandler.processContact(
        Jolt,
        bodyAPointer,
        bodyBPointer,
        manifoldPointer
      )
    }

    contactListener.OnContactRemoved = () => undefined

    physicsSystem.SetContactListener(contactListener)
  }

  static processContact(
    Jolt: typeof JoltType,
    bodyAPointer: number,
    bodyBPointer: number,
    manifoldPointer: number
  ) {
    const bodyA = Jolt.wrapPointer(bodyAPointer, Jolt.Body)
    const bodyB = Jolt.wrapPointer(bodyBPointer, Jolt.Body)

    const obj3dA =
      ContactHandler.obj3ds[bodyA.GetID().GetIndex()]
    const obj3dB =
      ContactHandler.obj3ds[bodyB.GetID().GetIndex()]

    // if not between registered contact objects, skip
    if (!obj3dA || !obj3dB) return

    const partA = obj3dA as IPart
    const partB = obj3dB as IPart

    // if neither are Part, skip
    if (!partA.id && !partB.id) return

    const manifold = Jolt.wrapPointer(
      manifoldPointer,
      Jolt.ContactManifold
    )

    const normal = manifold.get_mWorldSpaceNormal()

    // if didn't penetrate, is only speculative, skip
    const penetration = manifold.get_mPenetrationDepth()
    // if (penetration < -0.01) return

    const {
      linearVelocity: linearVelocityA,
      angularVelocity: angularVelocityA,
    } = obj3dA

    const {
      linearVelocity: linearVelocityB,
      angularVelocity: angularVelocityB,
    } = obj3dB

    const rotationA = bodyA.GetRotation()
    const rotationB = bodyB.GetRotation()

    const {
      inverseMass: inverseMassA,
      contacts: contactsA,
    } = obj3dA
    const {
      inverseMass: inverseMassB,
      contacts: contactsB,
    } = obj3dB

    // Calculate effective mass along the contact normal
    const effectiveMass =
      inverseMassA + inverseMassB > 0
        ? 1.0 / (inverseMassA + inverseMassB)
        : 1e8

    // Friction calculation
    // TODO scale friction effect with normal angle
    const frictionA = bodyA.GetFriction()
    const frictionB = bodyB.GetFriction()
    const combinedFriction = Math.sqrt(
      Math.max(0, frictionA) * Math.max(0, frictionB)
    )

    const pointsOnA =
      manifold.get_mRelativeContactPointsOn1()
    const pointsOnB =
      manifold.get_mRelativeContactPointsOn2()

    let i = 0

    // while (true) {
    for (let x = 0; x < 5; x++) {
      try {
        const pointOnA = pointsOnA.at(i)
        if (!pointsOnA || !pointOnA.Length()) break
        const pointOnB = pointsOnB.at(i)
        if (!pointsOnB || !pointOnB.Length()) break

        const worldPosition = joltToVec3(
          manifold.GetWorldSpaceContactPointOn1(
            i
          ) as any as JoltType.Vec3
        )

        // Calculate velocity at contact point due to angular velocity: v = w x r
        const vAngA = angularVelocityA.Cross(pointOnA) // Vec3
        const vAngB = angularVelocityB.Cross(pointOnB) // Vec3

        // Total velocity at contact point for each body
        const vContactA = linearVelocityA.Add(vAngA)
        const vContactB = linearVelocityB.Add(vAngB)

        // Relative velocity at contact
        const relativeVelocity = vContactB.Sub(vContactA)

        // Project relative velocity onto contact normal to get impact velocity
        const impactVelocity = relativeVelocity.Dot(normal)

        // Impact strength: normal impulse estimate
        const strength = Math.abs(
          effectiveMass * impactVelocity
        )

        // Friction force is proportional to normal impulse (Coulomb friction model)
        const friction = combinedFriction * strength

        if (partA.id) {
          contactsA.push({
            worldPosition,
            position: joltToScaledPartVec3(
              rotationA.MulVec3(pointOnA),
              partA
            ),

            strength,
            friction,
            otherBodyId: bodyB.GetID().GetIndex(),
          })
        }

        if (partB.id)
          contactsB.push({
            worldPosition,
            position: joltToScaledPartVec3(
              rotationB.MulVec3(pointOnB),
              partB
            ),

            strength,
            friction,
            otherBodyId: bodyA.GetID().GetIndex(),
          })

        i++
      } catch (e) {
        console.log(e)
      } finally {
        break
      }
    }
  }
}
