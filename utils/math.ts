import * as THREE from 'three'
import type JoltType from 'jolt-physics'
import {
  axisConfigs,
  jointAxisConfigs,
  Jolt,
  partAxisConfigs,
} from './world'
import {
  JointAxis,
  Part,
  PartAxis,
  PartAxisVec3,
  RawAxisVec3,
} from './types'

// Helper to convert degrees to radians
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function rotateByAxis(
  quat: THREE.Quaternion,
  axis: THREE.Vector3,
  angle: number
): void {
  quat.multiply(
    new THREE.Quaternion().setFromAxisAngle(
      axis.normalize(),
      angle
    )
  )
}

export function quaternionFromYPR(
  y = 0,
  p = 0,
  r = 0
): THREE.Quaternion {
  let quaternion = new THREE.Quaternion(0, 0, 0, 1)

  rotateByAxis(
    quaternion,
    jointToThreeAxis('y'),
    degToRad(y)
  )
  rotateByAxis(
    quaternion,
    jointToThreeAxis('p'),
    degToRad(p)
  )
  rotateByAxis(
    quaternion,
    jointToThreeAxis('r'),
    degToRad(r)
  )

  return quaternion
}

export const partToThreeAxis = (
  axis: PartAxis,
  value = 1
) => {
  const result = new THREE.Vector3(0, 0, 0)
  result[partAxisConfigs[axis].rawAxis] = value
  return result
}

export const jointToThreeAxis = (
  axis: JointAxis,
  value = 1
) => {
  const result = new THREE.Vector3(0, 0, 0)
  result[jointAxisConfigs[axis].rawAxis] = value
  return result
}

export const toThreeVec3 = (
  v: JoltType.Vec3
): THREE.Vector3 =>
  new THREE.Vector3(v.GetX(), v.GetY(), v.GetZ())

export const toRawVec3 = (
  v: JoltType.Vec3
): RawAxisVec3 => ({
  x: v.GetX(),
  y: v.GetY(),
  z: v.GetZ(),
})
export const toPartVec3 = (
  v: JoltType.Vec3
): PartAxisVec3 => ({
  w: v.GetX(),
  l: v.GetY(),
  t: v.GetZ(),
})

export const toScaledPartVec3 = (
  v: JoltType.Vec3,
  part: Part
): PartAxisVec3 => {
  const result = toPartVec3(v)

  const { l, w, t } = part.bp.hSize
  if (l) result.l /= l
  else result.l = 0

  if (w) result.w /= w
  else result.w = 0

  if (t) result.t /= t
  else result.t = 0

  return result
}

export const toJoltVec3 = (
  v: THREE.Vector3
): JoltType.Vec3 => new Jolt.Vec3(v.x, v.y, v.z)

export const toThreeQuat = (
  q: JoltType.Quat
): THREE.Quaternion =>
  new THREE.Quaternion(
    q.GetX(),
    q.GetY(),
    q.GetZ(),
    q.GetW()
  )

export const toJoltQuat = (
  q: THREE.Quaternion
): JoltType.Quat => new Jolt.Quat(q.x, q.y, q.z, q.w)

export function exponentiate(
  base: number,
  exponent: number
): number {
  let result = Math.abs(base) ** exponent
  return base >= 0 ? result : -result
}

export function weakenBy(
  value: number,
  factor: number
): number {
  let result = Math.abs(value)
  result = Math.max(0, result - factor)
  return value >= 0 ? result : -result
}

// Mapping values
export function lerp(
  min: number,
  max: number,
  t: number,
  clampResult?: boolean
): number {
  if (clampResult) t = clamp(0, 1, t)
  return min + (max - min) * t
}
export function unlerp(
  min: number,
  max: number,
  v: number,
  clampResult?: boolean,
  /** Return value if the min and max are the same */
  zeroWidthValue = 0.5
): number {
  // if everything is identical, return zeroWidthValue
  if (v == max && v == min) return zeroWidthValue

  const delta = max - min

  let result = (v - min) / delta
  if (clampResult) result = clamp(0, 1, result)
  return result
}

export function scale(
  trgMin: number,
  trgMax: number,
  srcMin: number,
  srcMax: number,
  srcT: number,
  clampResult?: boolean
): number {
  return lerp(
    trgMin,
    trgMax,
    unlerp(srcMin, srcMax, srcT),
    clampResult
  )
}

export function clamp(
  min: number,
  max: number,
  n: number
): number {
  return Math.max(Math.min(n, max), min)
}
