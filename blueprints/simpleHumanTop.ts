import { Obj3dShape } from '../src/@types'
import { PartBlueprint } from '../src/@types/blueprint'

const blueprint: PartBlueprint = {
  id: 'chest',
  size: { l: 0.2, w: 0.3, t: 0.08 },
  children: [
    {
      id: 'lower-neck',

      shape: Obj3dShape.Cylinder,
      size: { l: 0.04, w: 0.07 },
      joint: {
        parentOffset: {
          from: { l: 1 },
          l: 0.002,
          t: 0.02,
        },
        childOffset: {
          from: { l: -1 },
          l: -0.002,
          t: 0.02,
        },
        axis: { p: -10 },
        mirror: { y: 1, r: 1 },
        limits: { y: 10, p: 20, r: 20 },
      },
      child: {
        id: 'upper-neck',

        shape: Obj3dShape.Cylinder,
        size: { l: 0.04, w: 0.07 },
        joint: {
          parentOffset: {
            from: { l: 1 },
            l: 0.002,
            t: 0.02,
          },
          childOffset: {
            from: { l: -1 },
            l: -0.002,
            t: 0.02,
          },
          axis: { p: -10 },
          mirror: { y: 1, r: 1 },
          limits: { y: 10, p: 20, r: 20 },
        },
        child: {
          id: 'head',

          shape: Obj3dShape.Capsule,
          size: { l: 0.05, w: 0.15 },
          joint: {
            parentOffset: {
              from: { l: 1 },
              l: 0.04,
              t: 0.02,
            },
            childOffset: {
              from: { l: -1 },
              l: -0.02,
              t: 0.05,
            },
            axis: { p: -10 },
            mirror: { y: 1, r: 1 },
            limits: { y: 20, p: 40, r: 30 },
          },
        },
      },
    },
    {
      id: 'shoulder',
      symmetrical: true,

      size: { l: 0.11, w: 0.01, t: 0.08 },
      joint: {
        parentOffset: {
          from: { w: 1, l: 1, t: 1 },
          w: -0.06,
          l: -0.045,
        },
        childOffset: { from: { l: -1, w: 1 }, l: -0 },
        axis: { y: -70, p: -10, r: 80 },
        mirror: { y: 1, p: 1 },
        limits: { y: 10, p: 10 },
      },
      child: {
        id: 'upper_arm',

        size: { l: 0.22, w: 0.04, t: 0.05 },
        joint: {
          parentOffset: {
            from: { l: 1, w: -1 },
            l: 0,
            w: -0.01,
          },
          childOffset: { from: { l: -1 }, l: -0 },
          axis: { y: -40, p: 10, r: -20 },
          mirror: { p: 1 },
          limits: { y: 130, p: 110, r: 40 },
        },
        child: {
          id: 'lower_arm',
          size: { l: 0.22, w: 0.04, t: 0.03 },
          joint: {
            parentOffset: { from: { l: 1 } },
            childOffset: { from: { l: -1 } },
            axis: { p: -80, r: 80 },
            mirror: { y: 1 },
            limits: { y: 80, r: 80 },
          },
          child: {
            id: 'hand',
            size: { l: 0.05, w: 0.04, t: 0.02 },
            joint: {
              parentOffset: { from: { l: 1, t: -1 } },
              childOffset: { from: { l: -1, t: -1 } },
              axis: { y: 10, p: 10, r: 10 },
              mirror: { p: 1 },
              limits: { y: 20, p: 60 },
            },
          },
        },
      },
    },
  ],
}

export default blueprint
