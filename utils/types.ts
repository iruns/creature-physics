import type JoltType from 'jolt-physics'
import Jolt from 'jolt-physics'
import * as THREE from 'three'

export type Axis = 'x' | 'y' | 'z'
export type RotationAxis = 'y' | 'p' | 'r'

export const axisConfigs: {
  label: string
  rAxis: RotationAxis
  axis: Axis
  idx: number
  joltAxis: number
}[] = [
  {
    label: 'Yaw',
    rAxis: 'y',
    axis: 'y',
    idx: 1,
    joltAxis: Jolt.SixDOFConstraintSettings_EAxis_RotationY,
  },
  {
    label: 'Pitch',
    rAxis: 'p',
    axis: 'z',
    idx: 2,
    joltAxis: Jolt.SixDOFConstraintSettings_EAxis_RotationZ,
  },
  {
    label: 'Roll',
    rAxis: 'r',
    axis: 'x',
    idx: 0,
    joltAxis: Jolt.SixDOFConstraintSettings_EAxis_RotationX,
  },
]

// TODO, use these
export type YPSet = {
  y: number
  p: number
}
export type RSet = {
  r: number
}

type N = YPSet | RSet

// Blueprint
export type PartBlueprint = {
  name: string
  shape: JoltType.Shape
  children?: PartBlueprint[]
  // Only root part has position/rotation
  position?: [number, number, number]
  rotation?: YPSet & RSet
  // Only for non-root parts
  joint?: JointBlueprint
} & Partial<PartBlueprintDefaults>

export interface PartBlueprintDefaults {
  mass: number
  friction: number
  restitution: number
}

export type JointBlueprint = {
  parentOffset: [number, number, number] // Anchor in parent local space
  childOffset: [number, number, number] // Anchor in child local space
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
export interface BakedPartBlueprint extends PartBlueprint {
  idx: number

  parent?: BakedPartBlueprint
  children?: BakedPartBlueprint[]

  worldPosition: THREE.Vector3
  worldRotation: THREE.Quaternion

  joint?: BakedJointBlueprint
}

export interface BakedJointBlueprint
  extends JointBlueprint {
  rotation: THREE.Quaternion
  yawAxis: THREE.Vector3
  twistAxis: THREE.Vector3
}

// Resulting creature
export interface Part {
  bp: BakedPartBlueprint
  body: JoltType.Body
  children?: Record<string, Part>
  // Only for non-root parts
  parent?: Part
  joint?: JoltType.SixDOFConstraint
  torque: YPSet | RSet
}

export type RootPart = Omit<Part, 'parent' | 'joint'>

export interface BuildResult {
  creature: RootPart
  ragdoll: JoltType.Ragdoll | null
  parts: Record<string, Part>
  bodies: Record<string, JoltType.Body>
  joints: Record<string, JoltType.SixDOFConstraint>
}
