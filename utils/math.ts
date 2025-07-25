import * as THREE from 'three'
import type JoltType from 'jolt-physics'
import { Jolt } from './world'

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
  yaw = 0,
  pitch = 0,
  roll = 0
): THREE.Quaternion {
  let quaternion = new THREE.Quaternion(0, 0, 0, 1)

  rotateByAxis(
    quaternion,
    new THREE.Vector3(0, 1, 0),
    degToRad(yaw)
  )
  rotateByAxis(
    quaternion,
    new THREE.Vector3(1, 0, 0),
    degToRad(pitch)
  )
  rotateByAxis(
    quaternion,
    new THREE.Vector3(0, 0, 1),
    degToRad(roll)
  )

  return quaternion
}

export const toThreeVec3 = (
  v: JoltType.Vec3
): THREE.Vector3 =>
  new THREE.Vector3(v.GetX(), v.GetY(), v.GetZ())

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
