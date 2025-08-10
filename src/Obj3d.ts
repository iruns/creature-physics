import type JoltType from 'jolt-physics'
import {
  IObj3D,
  PhysicsUserObj,
  VizUserObj,
} from './@types'
import {
  copyJoltRVec3,
  copyJoltQuat,
  copyJoltVec3,
} from './utils/vector'

export class Obj3d implements IObj3D {
  physicsObj: PhysicsUserObj
  vizObj?: VizUserObj

  constructor(body: JoltType.Body) {
    this.physicsObj = {
      body,
      obj3d: this,
      inverseMass: body
        .GetMotionProperties()
        .GetInverseMass(),

      position: copyJoltRVec3(body.GetPosition()),
      rotation: copyJoltQuat(body.GetRotation()),
      linearVelocity: copyJoltVec3(
        body.GetLinearVelocity()
      ),
      angularVelocity: copyJoltVec3(
        body.GetAngularVelocity()
      ),

      contacts: [],
    }
  }

  update(): void {
    const {
      physicsObj,
      physicsObj: { body },
    } = this

    copyJoltRVec3(body.GetPosition(), physicsObj.position)
    copyJoltQuat(body.GetRotation(), physicsObj.rotation)
    copyJoltVec3(
      body.GetLinearVelocity(),
      physicsObj.linearVelocity
    )
    copyJoltVec3(
      body.GetAngularVelocity(),
      physicsObj.angularVelocity
    )
  }
}
