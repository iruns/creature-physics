import initJolt from 'jolt-physics'
import { Part, PartBlueprint, PartViz } from './utils/types'
import { buildRagdollFromBlueprint } from './utils/creatureBuilder'
import {
  addToThreeScene,
  camera,
  initRenderer,
  render,
  visualizePart,
} from './utils/visualization'
import {
  physicsSystem,
  initWorld,
  updatePhysics,
  createFloor,
} from './utils/world'
import {
  createJointControls,
  updateJointTorques,
} from './utils/jointControl'

window.addEventListener('DOMContentLoaded', () => {
  initJolt().then(function (Jolt) {
    initRenderer()
    initWorld(Jolt)

    const floorBody = createFloor()
    addToThreeScene(floorBody, 0x888888)

    Jolt.BoxShape
    Jolt.CapsuleShape
    Jolt.CylinderShape
    Jolt.SphereShape

    // Blueprint for minimal skeleton: upper arm and lower arm
    const blueprint: PartBlueprint = {
      name: 'upper-arm',
      // shape: PartShape.Cylinder,
      size: { l: 0.4, w: 0.06, t: 0.03, r: 0 },
      position: { x: 0, y: 0.5, z: 0 },
      rotation: { y: 30, p: 0, r: 0 },
      children: [
        {
          name: 'lower-arm',
          // shape: PartShape.Capsule,
          // shape: PartShape.Cylinder,
          size: { l: 0.4, w: 0.04, t: 0.02, r: 0 },
          // shape: PartShape.Box,
          // size: { l: 0.4, w: 0.04, r: 0.02 },
          joint: {
            // 1
            parentOffset: { l: 0.2 },
            childOffset: { l: -0.2 },
            axis: { y: 0, p: 30, r: 0 },
            limits: { y: 30, p: 60 },
            maxTorque: 5,
          },
          // children: [
          //   {
          //     name: 'lower-arm-end',
          //     // shape: new Jolt.CapsuleShape(0.15, 0.05),
          //     // shape: new Jolt.BoxShape(
          //     //   new Jolt.Vec3(0.02, 0.02, 0.1)
          //     // ),
          //     size: { l: 0.2, w: 0.04, r: 0 },
          //     joint: {
          //       // 1
          //       parentOffset: [0, 0, 0.2],
          //       childOffset: [0, 0, -0.1],
          //       axis: { y: 0, p: 0, r: 0 },
          //       limits: { r: 60 },
          //       maxTorque: 0.1,
          //     },
          //     children: [
          //       {
          //         name: 'hand',
          //         // shape: new Jolt.CapsuleShape(0.15, 0.05),
          //         // shape: new Jolt.BoxShape(
          //         //   new Jolt.Vec3(0.03, 0.02, 0.04)
          //         // ),
          //         size: { l: 0.08, w: 0.04, t: 0.03, r: 0 },
          //         joint: {
          //           // 1
          //           parentOffset: [0, 0, 0.1],
          //           childOffset: [0, 0, -0.04],
          //           axis: { y: 0, p: 0, r: 0 },
          //           limits: { y: 0, p: 60 },
          //           maxTorque: 0.05,
          //         },
          //       },
          //     ],
          //   },
          // ],
        },
      ],
    }

    // Use the blueprint utility
    const { creature, ragdoll, parts, bodies, joints } =
      buildRagdollFromBlueprint(blueprint, physicsSystem, 1)

    if (!ragdoll) return

    // Add joint motor sliders UI
    createJointControls(parts)

    // Recursively add bodies to Three.js scene using blueprint and bodies map
    function toInterface(
      part: Part,
      parentPartViz?: PartViz
    ) {
      const { children } = part

      // If this part has a joint, visualize its limits at the joint anchor
      const partViz = visualizePart(part, parentPartViz)

      if (children) {
        partViz.userData.children = {}
        for (const name in children)
          partViz.userData.children[name] = toInterface(
            children[name],
            partViz
          )
      }

      return partViz
    }

    const creatureViz = toInterface(creature)

    camera.position.z = 4
    camera.position.y = 1.5

    // Animation loop
    const timeStep = 1.0 / 30.0
    let t = 0
    let off = false
    setInterval(() => {
      updateJointTorques(parts)

      updatePhysics(timeStep)
      render(timeStep)

      if (!off && !bodies['lower-arm'].IsActive()) {
        off = true
        console.log(t)
      }
      t++
    }, timeStep * 1000)
  })
})
