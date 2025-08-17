import {
  CreatureJointBlueprintDefaults,
  MaterialBp,
} from '../@types/blueprint'

export const defaultMaterialBp: Required<MaterialBp> = {
  color: 0x888888,
  density: 985,
  friction: 0.5,
  restitution: 0.1,
}

export const defaultJointBp: CreatureJointBlueprintDefaults =
  {
    factors: {
      toEnd: 1,
      others: 0.2,
    },

    torque: {
      max: 10,
      floor: 0.1,
    },

    maxVelocity: 10,

    zeroing: {
      frac: 0.1,
      start: 0.5,
      exp: 3,
    },
  }
