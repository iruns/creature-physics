import type JoltType from 'jolt-physics'
import * as THREE from 'three'
import {
  BakedJointBlueprint,
  BakedPartBlueprint,
} from './blueprint'

export type RawAxis = 'x' | 'y' | 'z'
export type PartAxis = 'l' | 'w' | 't'
export type JointAxis = 'y' | 'p' | 'r'
export type AnchorValue = -1 | 0 | 1

export type AxisConfig = {
  torqueAxis: RawAxis
  rawAxis: RawAxis
  partLabel: string
  partAxis: PartAxis
  jointLabel: string
  jointAxis: JointAxis
  joltAxis: JoltType.SixDOFConstraintSettings_EAxis
}

export type RawAxisVec3<T = number> = Record<RawAxis, T>
export type PartAxisVec3<T = number> = Record<PartAxis, T>
export type JointAxisVec3<T = number> = Record<JointAxis, T>

export interface IObj3D {
  physicsObj: PhysicsUserObj
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
  Jolt: typeof JoltType
  physicsSystem: JoltType.PhysicsSystem

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

export interface PhysicsUserObj {
  body: JoltType.Body
  obj3d: IObj3D
  inverseMass: number

  // TODO check if this can be changed to THREE or raw vec3s
  position: JoltType.RVec3
  rotation: JoltType.Quat
  linearVelocity: JoltType.Vec3
  angularVelocity: JoltType.Vec3

  contacts: Contact[]
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
