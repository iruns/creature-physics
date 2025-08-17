import type JoltType from 'jolt-physics'
import {
  Contact,
  IObj3D,
  Obj3dShapeType,
  VizUserObj,
} from './@types'
import {
  copyJoltVec3,
  joltToVec3,
  joltToQuat,
} from './utils/vector'
import { Quat, Vec3 } from './@types/axes'
import { Obj3DBp } from './@types/blueprint'
import CreatureWorld from './CreatureWorld'

export class Obj3d implements IObj3D {
  bp: Obj3DBp

  body: JoltType.Body
  inverseMass: number

  /** Defaults to Box */
  shape?: Obj3dShapeType
  size: Vec3 = {
    x: 0,
    y: 0,
    z: 0,
  }

  position: Vec3
  rotation: Quat
  linearVelocity: JoltType.Vec3
  angularVelocity: JoltType.Vec3

  contacts: Contact[]

  vizObj?: VizUserObj

  constructor({
    body,
    bp,
    position,
  }: {
    body?: JoltType.Body
    bp: Obj3DBp
    position?: Vec3
  }) {
    this.bp = bp
    const { size, shapeType, layer } = bp

    if (!body) {
      const { Jolt, bodyInterface } = CreatureWorld

      let shape: JoltType.ConvexShape

      switch (shapeType) {
        case Obj3dShapeType.Sphere:
          shape = new Jolt.SphereShape(size.y / 2)
          break

        case Obj3dShapeType.Cylinder:
          shape = new Jolt.CylinderShape(
            size.y / 2,
            size.x / 2,
            0
          )
          break

        case Obj3dShapeType.Capsule:
          shape = new Jolt.CapsuleShape(
            size.y / 2,
            size.x / 2
          )
          break

        default:
          shape = new Jolt.BoxShape(
            new Jolt.Vec3(
              size.x / 2,
              size.y / 2,
              size.z / 2
            ),
            0.05,
            undefined
          )
          break
      }

      const density = bp.density ?? 1000
      const isStatic = density ? false : true
      shape.SetDensity(density)

      const creationSettings =
        new Jolt.BodyCreationSettings(
          shape,
          new Jolt.RVec3(
            position?.x ?? 0,
            position?.y ?? 0,
            position?.z ?? 0
          ),
          new Jolt.Quat(),
          isStatic
            ? Jolt.EMotionType_Static
            : Jolt.EMotionType_Dynamic,
          layer ?? isStatic ? 0 : 1
        )

      body = bodyInterface.CreateBody(creationSettings)
      Jolt.destroy(creationSettings)
      bodyInterface.AddBody(
        body.GetID(),
        Jolt.EActivation_Activate
      )
    }

    this.body = body

    this.inverseMass = body
      .GetMotionProperties()
      .GetInverseMass()

    this.shape = shapeType
    if (size) this.size = size

    this.position = joltToVec3(
      body.GetPosition() as any as JoltType.Vec3
    )
    this.rotation = joltToQuat(body.GetRotation())
    this.linearVelocity = copyJoltVec3(
      body.GetLinearVelocity()
    )
    this.angularVelocity = copyJoltVec3(
      body.GetAngularVelocity()
    )

    this.contacts = []
  }

  update(): void {
    const {
      body,
      position,
      rotation,
      linearVelocity,
      angularVelocity,
      contacts,
    } = this

    joltToVec3(
      body.GetPosition() as any as JoltType.Vec3,
      position
    )

    joltToQuat(body.GetRotation(), rotation)
    copyJoltVec3(body.GetLinearVelocity(), linearVelocity)
    copyJoltVec3(body.GetAngularVelocity(), angularVelocity)

    contacts.length = 0
  }
}
