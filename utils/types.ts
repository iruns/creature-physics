import type JoltType from 'jolt-physics'
import * as THREE from 'three'

// TODO, use these
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
  shape: JoltType.Shape
  children?: PartBlueprint[]
  // Only root part has position/rotation
  position?: [number, number, number]
  yprRotation?: [number, number, number]
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
  yprAxes: [number, number, number] // Yaw, pitch, roll axes in parent local space
  ypLimits: [number, number] // Yaw, pitch limits in degrees
  // rLimit: number // Roll limit in degrees
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
  torque: [number, number, number]
}

export type RootPart = Omit<Part, 'parent' | 'joint'>

export interface BuildResult {
  creature: RootPart
  ragdoll: JoltType.Ragdoll | null
  parts: Record<string, Part>
  bodies: Record<string, JoltType.Body>
  joints: Record<string, JoltType.SixDOFConstraint>
}
