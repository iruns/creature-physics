import type JoltType from 'jolt-physics'

export type RawAxis = 'x' | 'y' | 'z'
export type PartAxis = 'l' | 'w' | 't'
export type JointAxis = 'y' | 'p' | 'r'
export type AnchorValue = -1 | 0 | 1

export type AxisConfig = {
  torqueAxis: RawAxis
  rawAxis: RawAxis
  partLabel: string
  partAxis: PartAxis
  jointLabel: string
  jointAxis: JointAxis
  joltAxis: JoltType.SixDOFConstraintSettings_EAxis
}

export type RawAxisVec3<T = number> = Record<RawAxis, T>
export type PartAxisVec3<T = number> = Record<PartAxis, T>
export type JointAxisVec3<T = number> = Record<JointAxis, T>
