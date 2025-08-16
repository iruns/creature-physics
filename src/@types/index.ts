import type JoltType from 'jolt-physics'
import * as THREE from 'three'
import {
  BakedJointBlueprint,
  BakedPartBlueprint,
} from './blueprint'
import {
  JointAxisVec3,
  Vec3,
  PartAxisVec3,
  Quat,
} from './axes'

export interface IObj3D {
  // physics stuff
  body: JoltType.Body
  inverseMass: number

  /** Defaults to Box */
  shape?: Obj3dShape
  size: Vec3

  // for viz
  position: Vec3
  rotation: Quat
  // for contact
  linearVelocity: JoltType.Vec3
  angularVelocity: JoltType.Vec3

  contacts: Contact[]

  // viz stuff
  vizObj?: VizUserObj

  update(): void
}

export enum Obj3dShape {
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
  worldPosition: Vec3
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
