import { Obj3dShape } from '.'
import {
  PartAxisVec3,
  AnchorValue,
  JointAxisVec3,
} from './axes'
import * as THREE from 'three'

// Blueprint
export type PartBlueprint = {
  id: string

  symmetrical?: boolean

  /** Defaults to Box */
  shape?: Obj3dShape
  size: {
    /** Length (y), or sphere radius, will be used for unset dimensions */
    l: number
    /** Width (x) or cylinder and capsule radius, will be used for y it's unser */
    w?: number
    /** Thickness (z) */
    t?: number
  }

  child?: PartBlueprint
  children?: PartBlueprint[]

  // Only for non-root parts
  joint?: JointBlueprint
} & Partial<PartBlueprintDefaults>

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
