import type JoltType from 'jolt-physics'
import * as THREE from 'three'

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

// Blueprint
export type PartBlueprint = {
  id: string

  symmetrical?: boolean

  /** Defaults to Box */
  shape?: PartShape
  size: {
    /** Length (y), or sphere radius, will be used for unset dimensions */
    l: number
    /** Width (x) or cylinder and capsule radius, will be used for y it's unser */
    w?: number
    /** Thickness (z) */
    t?: number
  }

  children?: PartBlueprint[]

  // Only for non-root parts
  joint?: JointBlueprint
} & Partial<PartBlueprintDefaults>

export enum PartShape {
  Sphere,
  Cylinder,
  Capsule,
  Box,
}

export interface PartBlueprintDefaults extends Material {
  color: number
}

export interface Material {
  density: number
  friction: number
  restitution: number
}

export type JointBlueprint = {
  /** Anchor in parent local space, with optional "at" as the origin */
  parentOffset: Partial<PartAxisVec3> & {
    from?: Partial<PartAxisVec3<AnchorValue>>
  }
  /** Anchor in child local space, with optional "at" as the origin */
  childOffset: Partial<PartAxisVec3> & {
    from?: Partial<PartAxisVec3<AnchorValue>>
  }
  /** Yaw, pitch, roll axes in parent local space */
  axis?: Partial<JointAxisVec3>
  /** Joint directions to mirror */
  mirror?: Partial<JointAxisVec3<1 | 0 | boolean>>
  /** Yaw, pitch, roll limits in degrees, relative to axis */
  limits?: Partial<JointAxisVec3>
} & Partial<JointBlueprintDefaults>

export interface JointBlueprintDefaults {
  /** Factors of mass * distance that will be used for baseTorque.
   * Inheritable
   */
  factors: {
    /** Mass of parts AFTER this joint */
    toEnd: number
    /** Mass of parts other than AFTER this joint */
    others: number
  }

  torque: {
    /** Max torque for motors */
    max: number
    /** Min torque for motors, if not set, will be -maxForce */
    min?: number
    /** the minimum multiplier of force when there's no max velocity */
    floor: number
  }

  maxVelocity: number

  /** Settings for automatically rotating joint to the starting angle */
  zeroing: {
    /** Fraction of max torque to use as the maximum torque for this */
    frac: number
    /** At what deviation (to either direction), this force should start */
    start: number
    /** The exponent of this force. Typically > 1 to pnly have very large force near the limits */
    exp: number
  }
}

// Baked blueprint, pre conversion to creature
export type BakedPartBlueprint = Omit<
  PartBlueprint,
  'parent' | 'children'
> &
  PartBlueprintDefaults & {
    idx: number

    hSize: PartAxisVec3

    parent?: BakedPartBlueprint
    children?: BakedPartBlueprint[]

    worldPosition: THREE.Vector3
    worldRotation: THREE.Quaternion

    joint?: BakedJointBlueprint
  }

export type BakedJointBlueprint = JointBlueprint &
  JointBlueprintDefaults & {
    parentOffset: JointBlueprint['parentOffset'] & {
      baked: THREE.Vector3
    }
    childOffset: JointBlueprint['parentOffset'] & {
      baked: THREE.Vector3
    }

    axis: NonNullable<JointBlueprint['axis']>
    mirror: NonNullable<JointBlueprint['mirror']>
    limits: NonNullable<JointBlueprint['limits']>

    rotation: THREE.Quaternion
    yawAxis: THREE.Vector3
    twistAxis: THREE.Vector3
  }

export interface IObj3D {
  physicsObj: PhysicsUserObj
  vizObj?: VizUserObj

  update(): void
}

// Resulting creature
export interface IPart extends IObj3D {
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

export interface ICreature {
  root: RootPart
  ragdoll: JoltType.Ragdoll
  parts: Record<string, IPart>
  bodies: Record<string, JoltType.Body>
  joints: Record<string, JoltType.SixDOFConstraint>
}

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
