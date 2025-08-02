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
  name: string

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
    /** Rounding radius for box shape */
    r?: number
  }

  children?: PartBlueprint[]
  // Only root part has position/rotation
  position?: Partial<RawAxisVec3>
  rotation?: Partial<JointAxisVec3>
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
  /** Yaw, pitch, roll limits in degrees, relative to axis */
  limits?: Partial<JointAxisVec3>
} & Partial<JointBlueprintDefaults>

export interface JointBlueprintDefaults {
  /** max force for motors */
  maxTorque: number
  /** min force for motors, if not set, will be -maxForce */
  minTorque?: number
  torqueFloor: number
  targetVelocity: number

  centerringFraction: number
  centerringStart: number
  centerringExponent: number
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

    axis: NonNullable<JointBlueprint['axis']>
    limits: NonNullable<JointBlueprint['limits']>

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
  torqueDir: JointAxisVec3
  torque: JointAxisVec3
  lambda: JointAxisVec3
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
    torque: Partial<JointAxisVec3<THREE.ArrowHelper>>
    lambda: Partial<JointAxisVec3<THREE.ArrowHelper>>
  }
}
