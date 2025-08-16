import type JoltType from 'jolt-physics'
import {
  Contact,
  IObj3D,
  Obj3dShape,
  VizUserObj,
} from './@types'
import {
  copyJoltVec3,
  joltToVec3,
  joltToQuat,
} from './utils/vector'
import { Quat, Vec3 } from './@types/axes'

export class Obj3d implements IObj3D {
  body: JoltType.Body
  inverseMass: number

  /** Defaults to Box */
  shape?: Obj3dShape
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

  constructor(
    body: JoltType.Body,
    size: Vec3,
    shape: Obj3dShape = Obj3dShape.Box
  ) {
    this.body = body
    this.inverseMass = body
      .GetMotionProperties()
      .GetInverseMass()

    this.shape = shape
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
