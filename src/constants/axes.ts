import JoltType from 'jolt-physics'
import {
  AxisConfig,
  RawAxis,
  PartAxis,
  JointAxis,
} from '../@types/axes'

export const axisConfigs: AxisConfig[] = [
  // will be mirrored on symmetrical Parts
  {
    torqueAxis: 'y',
    rawAxis: 'z',
    partLabel: 'Thickness',
    partAxis: 't',
    jointLabel: 'Yaw',
    jointAxis: 'y',
    joltAxis: 0,
  },
  {
    torqueAxis: 'z',
    rawAxis: 'x',
    partLabel: 'Width',
    partAxis: 'w',
    jointLabel: 'Pitch',
    jointAxis: 'p',
    joltAxis: 0,
  },
  // will be mirrored on symmetrical Parts
  {
    torqueAxis: 'x',
    rawAxis: 'y',
    partLabel: 'Length',
    partAxis: 'l',
    jointLabel: 'Roll',
    jointAxis: 'r',
    joltAxis: 0,
  },
]

export const rawAxisConfigs = {} as Record<
  RawAxis,
  AxisConfig
>
export const partAxisConfigs = {} as Record<
  PartAxis,
  AxisConfig
>
export const jointAxisConfigs = {} as Record<
  JointAxis,
  AxisConfig
>
export const joltAxisConfigs = {} as Record<
  JoltType.SixDOFConstraintSettings_EAxis,
  AxisConfig
>

export function initAxes(Jolt: typeof JoltType) {
  axisConfigs.forEach((config) => {
    rawAxisConfigs[config.rawAxis] = config
    partAxisConfigs[config.partAxis] = config
    jointAxisConfigs[config.jointAxis] = config
    joltAxisConfigs[config.joltAxis] = config
  })
  rawAxisConfigs.x.joltAxis =
    Jolt.SixDOFConstraintSettings_EAxis_RotationX
  rawAxisConfigs.y.joltAxis =
    Jolt.SixDOFConstraintSettings_EAxis_RotationY
  rawAxisConfigs.z.joltAxis =
    Jolt.SixDOFConstraintSettings_EAxis_RotationZ

  jointAxisConfigs.p.joltAxis =
    Jolt.SixDOFConstraintSettings_EAxis_RotationZ
  jointAxisConfigs.y.joltAxis =
    Jolt.SixDOFConstraintSettings_EAxis_RotationY
  jointAxisConfigs.r.joltAxis =
    Jolt.SixDOFConstraintSettings_EAxis_RotationX
}
