import type JoltType from 'jolt-physics'
import * as THREE from 'three'
import {
  BakedCreatureJointBlueprint,
  BakedCreaturePartBlueprint,
  Obj3DBp,
} from './blueprint'
import {
  JointAxisVec3,
  Vec3,
  PartAxisVec3,
  Quat,
} from './axes'

export interface IObj3D {
  bp: Obj3DBp

  // physics stuff
  body: JoltType.Body
  inverseMass: number

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

export enum Obj3dShapeType {
  Sphere,
  Cylinder,
  Capsule,
  Box,
}

// Resulting creature
export interface ICreature {
  root: RootCreaturePart
  ragdoll: JoltType.Ragdoll
  parts: Record<string, ICreaturePart>
  bodies: Record<string, JoltType.Body>
  joints: Record<string, JoltType.SixDOFConstraint>

  update(): void
}

export interface ICreaturePart {
  creature: ICreature
  obj: IObj3D

  bp: BakedCreaturePartBlueprint
  id: string

  children?: Record<string, ICreaturePart>
  // Only for non-root parts
  parent?: ICreaturePart

  joint?: IJoint
  applyDown(cb: (part: ICreaturePart) => void): void

  update(): void
}

export interface IJoint {
  bp: BakedCreatureJointBlueprint

  part: ICreaturePart
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

export type RootCreaturePart = Omit<
  ICreaturePart,
  'parent' | 'joint'
>

export interface Contact {
  worldPosition: Vec3
  position: PartAxisVec3

  strength: number
  friction: number
  otherBodyId: number
}

export interface VizUserObj {
  mesh: THREE.Mesh
  obj?: IObj3D
  part?: ICreaturePart

  /** From size and shape that will be used to size visualizations */
  vizRadius: number
  axes?: THREE.AxesHelper
  torque?: Partial<JointAxisVec3<THREE.ArrowHelper>>
  lambda?: Partial<JointAxisVec3<THREE.ArrowHelper>>
}
