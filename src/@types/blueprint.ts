import { Obj3dShapeType } from '.'
import {
  PartAxisVec3,
  AnchorValue,
  JointAxisVec3,
  Vec3,
} from './axes'
import * as THREE from 'three'

export type Obj3DBp = {
  /** Defaults to Box */
  shapeType?: Obj3dShapeType
  size: Vec3
  layer?: number
} & MaterialBp

export type CreaturePartBlueprint = {
  id: string

  symmetrical?: boolean

  obj?: Omit<Obj3DBp, 'size'>
  size: {
    /** Length (y), or sphere radius, will be used for unset dimensions */
    l: number
    /** Width (x) or cylinder and capsule radius, will be used for y it's unser */
    w?: number
    /** Thickness (z) */
    t?: number
  }

  child?: CreaturePartBlueprint
  children?: CreaturePartBlueprint[]

  // Only for non-root parts
  joint?: CreatureJointBlueprint
}

export interface MaterialBp {
  color?: number
  density?: number
  friction?: number
  restitution?: number
}

export type CreatureJointBlueprint = {
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
} & Partial<CreatureJointBlueprintDefaults>

export interface CreatureJointBlueprintDefaults {
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
export type BakedCreaturePartBlueprint = Omit<
  CreaturePartBlueprint,
  'parent' | 'children'
> & {
  idx: number

  obj: Obj3DBp
  hSize: PartAxisVec3

  parent?: BakedCreaturePartBlueprint
  children?: BakedCreaturePartBlueprint[]

  worldPosition: THREE.Vector3
  worldRotation: THREE.Quaternion

  joint?: BakedCreatureJointBlueprint
}

export type BakedCreatureJointBlueprint =
  CreatureJointBlueprint &
    CreatureJointBlueprintDefaults & {
      parentOffset: CreatureJointBlueprint['parentOffset'] & {
        baked: THREE.Vector3
      }
      childOffset: CreatureJointBlueprint['parentOffset'] & {
        baked: THREE.Vector3
      }

      axis: NonNullable<CreatureJointBlueprint['axis']>
      mirror: NonNullable<CreatureJointBlueprint['mirror']>
      limits: NonNullable<CreatureJointBlueprint['limits']>

      rotation: THREE.Quaternion
      yawAxis: THREE.Vector3
      twistAxis: THREE.Vector3
    }
