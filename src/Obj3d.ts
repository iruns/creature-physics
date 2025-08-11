import type JoltType from 'jolt-physics'
import { Contact, IObj3D, VizUserObj } from './@types'
import {
  copyJoltRVec3,
  copyJoltQuat,
  copyJoltVec3,
} from './utils/vector'

export class Obj3d implements IObj3D {
  body: JoltType.Body
  inverseMass: number

  position: JoltType.RVec3
  rotation: JoltType.Quat
  linearVelocity: JoltType.Vec3
  angularVelocity: JoltType.Vec3

  contacts: Contact[]

  vizObj?: VizUserObj

  constructor(body: JoltType.Body) {
    this.body = body
    this.inverseMass = body
      .GetMotionProperties()
      .GetInverseMass()
    this.position = copyJoltRVec3(body.GetPosition())
    this.rotation = copyJoltQuat(body.GetRotation())
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

    copyJoltRVec3(body.GetPosition(), position)
    copyJoltQuat(body.GetRotation(), rotation)
    copyJoltVec3(body.GetLinearVelocity(), linearVelocity)
    copyJoltVec3(body.GetAngularVelocity(), angularVelocity)

    contacts.length = 0
  }
}
