import type JoltType from 'jolt-physics'
import * as THREE from 'three'
import {
  BakedJointBlueprint,
  BakedPartBlueprint,
} from './blueprint'
import {
  JointAxisVec3,
  RawAxisVec3,
  PartAxisVec3,
} from './axes'

export interface IObj3D {
  // physics stuff
  body: JoltType.Body
  inverseMass: number

  // TODO check if this can be changed to THREE or raw vec3s
  position: JoltType.RVec3
  rotation: JoltType.Quat
  linearVelocity: JoltType.Vec3
  angularVelocity: JoltType.Vec3

  contacts: Contact[]

  // viz stuff
  vizObj?: VizUserObj

  update(): void
}

export enum PartShape {
  Sphere,
  Cylinder,
  Capsule,
  Box,
}

// Resulting creature
export interface ICreature {
  root: RootPart
  ragdoll: JoltType.Ragdoll
  parts: Record<string, IPart>
  bodies: Record<string, JoltType.Body>
  joints: Record<string, JoltType.SixDOFConstraint>

  update(): void
}

export interface IPart extends IObj3D {
  creature: ICreature

  bp: BakedPartBlueprint
  id: string

  children?: Record<string, IPart>
  // Only for non-root parts
  parent?: IPart

  joint?: IJoint
  applyDown(cb: (part: IPart) => void): void
}

export interface IJoint {
  bp: BakedJointBlueprint

  part: IPart
  joint: JoltType.SixDOFConstraint

  baseTorque: number
  maxTorque: number
  minTorque: number

  deviation: JointAxisVec3
  torqueDirection: JointAxisVec3<-1 | 0 | 1>
  torque: JointAxisVec3
  /** Lambda force of the motor to the target velocity */
  lambda: JointAxisVec3
}

export type RootPart = Omit<IPart, 'parent' | 'joint'>

export interface Contact {
  worldPosition: RawAxisVec3
  position: PartAxisVec3

  strength: number
  friction: number
  otherBodyId: number
}

export interface VizUserObj {
  mesh: THREE.Mesh
  obj3d: IObj3D

  /** From size and shape that will be used to size visualizations */
  vizRadius: number
  axes?: THREE.AxesHelper
  torque?: Partial<JointAxisVec3<THREE.ArrowHelper>>
  lambda?: Partial<JointAxisVec3<THREE.ArrowHelper>>
}
