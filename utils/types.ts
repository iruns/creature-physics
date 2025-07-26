import type JoltType from 'jolt-physics'
import * as THREE from 'three'

// Blueprint
export interface PartBlueprint {
  name: string
  shape: JoltType.Shape
  children?: PartBlueprint[]
  // Only root part has position/rotation
  position?: [number, number, number]
  yprRotation?: [number, number, number]
  // Only for non-root parts
  joint?: JointBlueprint
}

export interface JointBlueprint {
  parentOffset: [number, number, number] // Anchor in parent local space
  childOffset: [number, number, number] // Anchor in child local space
  yprAxes: [number, number, number] // Yaw, pitch, roll axes in parent local space
  yprLimits: [number, number, number] // Yaw, pitch, roll angles in degrees
}

// Prepped blueprint, pre conversion to creature
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
  twistAxis: THREE.Vector3
  planeAxis: THREE.Vector3
}

// Resulting creature
export interface Part {
  bp: BakedPartBlueprint
  body: JoltType.Body
  children?: Record<string, Part>
  // Only for non-root parts
  parent?: Part
  joint?: JoltType.SwingTwistConstraint
}

export type RootPart = Omit<Part, 'parent' | 'joint'>

export interface BuildResult {
  creature: RootPart
  ragdoll: JoltType.Ragdoll | null
  parts: Record<string, Part>
  bodies: Record<string, JoltType.Body>
  joints: Record<string, JoltType.SwingTwistConstraint>
}
