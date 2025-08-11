import type JoltType from 'jolt-physics'
import CreatureWorld from '../CreatureWorld'

// Helper to convert degrees to radians
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

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

/**
 * Computes the mass-weighted center of mass of a list of Jolt bodies.
 * Ignores static/kinematic bodies (mass = 0).
 * @param bodies Array of Jolt.Body
 * @returns RVec3 center of mass, or null if total mass is zero.
 */
export function getCenterOfMass(
  bodies: JoltType.Body[]
): JoltType.RVec3 | null {
  const { Jolt } = CreatureWorld

  let totalMass = 0
  let weightedSum = new Jolt.RVec3()

  for (const body of bodies) {
    const invMass =
      body.GetMotionProperties()?.GetInverseMass() ?? 0.0
    const mass = invMass > 0 ? 1.0 / invMass : 0.0
    if (mass === 0) continue // skip static/kinematic

    const position = body.GetCenterOfMassPosition() // RVec3
    weightedSum = weightedSum.AddRVec3(position.Mul(mass)) // RVec3.Mul(number)
    totalMass += mass
  }

  if (totalMass === 0) {
    Jolt.destroy(weightedSum)
    return null
  }

  const result = weightedSum.Div(totalMass)
  Jolt.destroy(weightedSum)

  return result
}
