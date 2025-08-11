import { PartBlueprint } from '../src/@types/blueprint'

const blueprint: PartBlueprint = {
  id: 'chest',
  size: { l: 0.2, w: 0.3, t: 0.08 },
  children: [
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
        limits: { p: 10 },
      },
      children: [
        {
          id: 'upper_arm',

          size: { l: 0.22, w: 0.03, t: 0.05 },
          joint: {
            parentOffset: {
              from: { l: 1, w: -1 },
              l: 0,
              w: -0.01,
            },
            childOffset: { from: { l: -1 }, l: -0 },
            axis: { y: -80, p: 40, r: -20 },
            mirror: { p: 1 },
            limits: { y: 120, p: 110, r: 40 },
          },
          children: [
            {
              id: 'lower_arm',
              size: { l: 0.22, w: 0.04, t: 0.02 },
              joint: {
                parentOffset: { from: { l: 1 } },
                childOffset: { from: { l: -1 } },
                axis: { p: -80, r: 80 },
                mirror: { y: 1 },
                limits: { y: 80, r: 80 },
              },
              children: [
                {
                  id: 'hand',
                  size: { l: 0.05, w: 0.04, t: 0.02 },
                  joint: {
                    parentOffset: { from: { l: 1 } },
                    childOffset: { from: { l: -1 } },
                    axis: { y: 10, p: 10, r: 10 },
                    mirror: { p: 1 },
                    limits: { y: 20, p: 60 },
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}

export default blueprint
