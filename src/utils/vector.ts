import * as THREE from 'three'
import type JoltType from 'jolt-physics'
import {
  jointAxisConfigs,
  Jolt,
  partAxisConfigs,
} from './world'
import {
  JointAxis,
  IPart,
  PartAxis,
  JointAxisVec3,
} from '../@types'
import { degToRad } from './math'

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

// to THREE
export function jointVec3ToThreeQuat(
  { y, p, r }: Partial<JointAxisVec3>,
  to = new THREE.Quaternion(0, 0, 0, 1)
): THREE.Quaternion {
  if (y)
    rotateByAxis(to, jointToThreeAxis('y'), degToRad(y))
  if (p)
    rotateByAxis(to, jointToThreeAxis('p'), degToRad(p))
  if (r)
    rotateByAxis(to, jointToThreeAxis('r'), degToRad(r))

  return to
}

export function partToThreeAxis(
  axis: PartAxis,
  to = new THREE.Vector3(0, 0, 0)
) {
  to[partAxisConfigs[axis].rawAxis] = 1
  return to
}

export function jointToThreeAxis(
  axis: JointAxis,
  to = new THREE.Vector3(0, 0, 0)
) {
  to[jointAxisConfigs[axis].rawAxis] = 1
  return to
}

export function joltToThreeVec3(
  v: JoltType.Vec3 | JoltType.RVec3,
  to = new THREE.Vector3()
) {
  to.set(v.GetX(), v.GetY(), v.GetZ())
  return to
}

export function joltToThreeQuat(
  q: JoltType.Quat,
  to = new THREE.Quaternion()
) {
  to.set(q.GetX(), q.GetY(), q.GetZ(), q.GetW())
  return to
}

// To Raw
export function toRawVec3(v: JoltType.Vec3) {
  return {
    x: v.GetX(),
    y: v.GetY(),
    z: v.GetZ(),
  }
}

// To Part
export function toPartVec3(v: JoltType.Vec3) {
  return {
    w: v.GetX(),
    l: v.GetY(),
    t: v.GetZ(),
  }
}

export function toScaledPartVec3(
  v: JoltType.Vec3,
  part: IPart
) {
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

// To Jolt
export function toJoltVec3(v: THREE.Vector3) {
  return new Jolt.Vec3(v.x, v.y, v.z)
}

export function toJoltQuat(q: THREE.Quaternion) {
  return new Jolt.Quat(q.x, q.y, q.z, q.w)
}

// Clone Jolt
export function copyJoltVec3(
  v: JoltType.Vec3,
  to = new Jolt.Vec3(0, 0, 0)
) {
  to.SetX(v.GetX())
  to.SetY(v.GetY())
  to.SetZ(v.GetZ())
  return to
}

export function copyJoltRVec3(
  v: JoltType.RVec3,
  to = new Jolt.RVec3(0, 0, 0)
) {
  to.SetX(v.GetX())
  to.SetY(v.GetY())
  to.SetZ(v.GetZ())
  return to
}

export function copyJoltQuat(
  q: JoltType.Quat,
  to = new Jolt.Quat(0, 0, 0, 0)
) {
  to.SetX(q.GetX())
  to.SetY(q.GetY())
  to.SetZ(q.GetZ())
  to.SetW(q.GetW())
  return to
}
