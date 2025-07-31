import type JoltType from 'jolt-physics'
import * as THREE from 'three'

export type RawAxis = 'x' | 'y' | 'z'
export type PartAxis = 'l' | 'w' | 't'
export type JointAxis = 'y' | 'p' | 'r'

export type AxisConfig = {
  torqueIdx: number
  rawAxis: RawAxis
  partLabel: string
  partAxis: PartAxis
  jointLabel: string
  jointAxis: JointAxis
  joltAxis: JoltType.SixDOFConstraintSettings_EAxis
}

export type PartAxisVec3<T = number> = Record<PartAxis, T>
export type JointAxisVec3<T = number> = Record<JointAxis, T>

export type YPSet = {
  y: number
  p: number
}
export type RSet = {
  r: number
}

// Blueprint
export type PartBlueprint = {
  name: string
  /** Defaults to Box */
  shape?: PartShape
  size: {
    /** Length (y), or sphere radius, will be used for unset dimensions */
    l: number
    /** Width (x) or cylinder and capsule radius, will be used for y it's unser */
    w?: number
    /** Thickness (z) */
    t?: number
    /** Rounding radius for box shape */
    r?: number
  }

  children?: PartBlueprint[]
  // Only root part has position/rotation
  position?: Record<RawAxis, number>
  rotation?: YPSet & RSet
  // Only for non-root parts
  joint?: JointBlueprint
} & Partial<PartBlueprintDefaults>

export enum PartShape {
  Sphere,
  Cylinder,
  Capsule,
  Box,
}

export interface PartBlueprintDefaults {
  color: number
  mass: number
  friction: number
  restitution: number
}

export type JointBlueprint = {
  parentOffset: Partial<PartAxisVec3> & {
    anchor?: Partial<PartAxisVec3>
  } // Anchor in parent local space
  childOffset: Partial<PartAxisVec3> & {
    anchor?: Partial<PartAxisVec3>
  } // Anchor in child local space
  axis: YPSet & RSet // Yaw, pitch, roll axes in parent local space
  limits: YPSet | RSet // Yaw and pitch OR roll limits in degrees
} & Partial<JointBlueprintDefaults>

export interface JointBlueprintDefaults {
  friction: number
  maxTorque: number // max force for motors
  minTorque?: number // min force for motors, if not set, will be maxForce
  // TODO torques should be per axis
  targetVelocity: number
}

// Baked blueprint, pre conversion to creature
export type BakedPartBlueprint = Omit<
  PartBlueprint,
  'parent' | 'children'
> &
  PartBlueprintDefaults & {
    idx: number

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

    rotation: THREE.Quaternion
    yawAxis: THREE.Vector3
    twistAxis: THREE.Vector3
  }

// Resulting creature
export interface Part {
  bp: BakedPartBlueprint
  body: JoltType.Body
  /** From size and shape that will be used to size visualizations */
  vizRadius: number
  children?: Record<string, Part>
  // Only for non-root parts
  parent?: Part
  joint?: JoltType.SixDOFConstraint
  torque: JointAxisVec3
}

export type RootPart = Omit<Part, 'parent' | 'joint'>

export interface BuildResult {
  creature: RootPart
  ragdoll: JoltType.Ragdoll | null
  parts: Record<string, Part>
  bodies: Record<string, JoltType.Body>
  joints: Record<string, JoltType.SixDOFConstraint>
}

export interface PartViz extends THREE.Mesh {
  userData: {
    parent?: PartViz
    children?: Record<string, PartViz>
    body: JoltType.Body
    part: Part
    torque: Partial<JointAxisVec3<THREE.Mesh>>
    // lambda: Partial<JointAxisVec3<THREE.Mesh>>
  }
}
