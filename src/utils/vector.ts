import * as THREE from 'three'
import type JoltType from 'jolt-physics'
import { IPart } from '../@types'
import {
  JointAxis,
  PartAxis,
  JointAxisVec3,
  Vec3,
  Quat,
  PartAxisVec3,
} from '../@types/axes'
import { degToRad } from './math'
import {
  jointAxisConfigs,
  partAxisConfigs,
} from '../constants/axes'
import CreatureWorld from '../CreatureWorld'

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
export function joltToVec3(
  v: JoltType.Vec3,
  to: Vec3 = { x: 0, y: 0, z: 0 }
) {
  to.x = v.GetX()
  to.y = v.GetY()
  to.z = v.GetZ()
  return to
}
export function partToVec3(
  v: PartAxisVec3,
  to: Vec3 = { x: 0, y: 0, z: 0 }
) {
  to.x = v.w
  to.y = v.l
  to.z = v.t
  return to
}

export function joltToQuat(
  v: JoltType.Quat,
  to: Quat = { x: 0, y: 0, z: 0, w: 0 }
) {
  to.x = v.GetX()
  to.y = v.GetY()
  to.z = v.GetZ()
  to.w = v.GetW()
  return to
}

// To Part
export function joltToPartVec3(
  v: JoltType.Vec3,
  to: PartAxisVec3 = {
    w: 0,
    l: 0,
    t: 0,
  }
) {
  to.w = v.GetX()
  to.l = v.GetY()
  to.t = v.GetZ()
  return to
}

export function joltToScaledPartVec3(
  v: JoltType.Vec3,
  part: IPart
) {
  const result = joltToPartVec3(v)

  const { l, w, t } = part.bp.hSize
  if (l) result.l /= l
  else result.l = 0

  if (w) result.w /= w
  else result.w = 0

  if (t) result.t /= t
  else result.t = 0

  return result
}

// Clone Jolt
export function copyJoltVec3(
  v: JoltType.Vec3,
  to = new CreatureWorld.Jolt.Vec3(0, 0, 0)
) {
  to.SetX(v.GetX())
  to.SetY(v.GetY())
  to.SetZ(v.GetZ())
  return to
}

export function copyJoltRVec3(
  v: JoltType.RVec3,
  to = new CreatureWorld.Jolt.RVec3(0, 0, 0)
) {
  to.SetX(v.GetX())
  to.SetY(v.GetY())
  to.SetZ(v.GetZ())
  return to
}

export function copyJoltQuat(
  q: JoltType.Quat,
  to = new CreatureWorld.Jolt.Quat(0, 0, 0, 0)
) {
  to.SetX(q.GetX())
  to.SetY(q.GetY())
  to.SetZ(q.GetZ())
  to.SetW(q.GetW())
  return to
}
