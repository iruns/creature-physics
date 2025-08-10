import type JoltType from 'jolt-physics'
import { getUserData, Jolt } from './world'
import { toRawVec3, toScaledPartVec3 } from './vector'
import { IPart } from '../@types'

export function setupCollisionFiltering(
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

export function setupContactListeners(
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

    processContact(
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

    processContact(
      bodyAPointer,
      bodyBPointer,
      manifoldPointer
    )
  }

  contactListener.OnContactRemoved = () => undefined

  physicsSystem.SetContactListener(contactListener)
}

function processContact(
  bodyAPointer: number,
  bodyBPointer: number,
  manifoldPointer: number
) {
  const bodyA = Jolt.wrapPointer(bodyAPointer, Jolt.Body)
  const bodyB = Jolt.wrapPointer(bodyBPointer, Jolt.Body)

  const userDataA = getUserData(bodyA)
  const userDataB = getUserData(bodyB)

  const partA = userDataA?.obj3d as IPart
  const partB = userDataB?.obj3d as IPart

  // if neither are Part, skip
  if (!partA?.id && !partB?.id) return

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
  } = userDataA

  const {
    linearVelocity: linearVelocityB,
    angularVelocity: angularVelocityB,
  } = userDataB

  const rotationA = bodyA.GetRotation()
  const rotationB = bodyB.GetRotation()

  const { inverseMass: inverseMassA, contacts: contactsA } =
    partA.physicsObj
  const { inverseMass: inverseMassB, contacts: contactsB } =
    partB.physicsObj

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

  const pointsOnA = manifold.get_mRelativeContactPointsOn1()
  const pointsOnB = manifold.get_mRelativeContactPointsOn2()

  let i = 0

  // while (true) {
  for (let x = 0; x < 5; x++) {
    try {
      const pointOnA = pointsOnA.at(i)
      if (!pointsOnA || !pointOnA.Length()) break
      const pointOnB = pointsOnB.at(i)
      if (!pointsOnB || !pointOnB.Length()) break

      const worldPosition = toRawVec3(
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
          position: toScaledPartVec3(
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
          position: toScaledPartVec3(
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
