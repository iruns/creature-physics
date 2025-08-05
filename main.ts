import initJolt from 'jolt-physics'
import {
  Part,
  PartBlueprint,
  PartShape,
  PartViz,
  RootPartBlueprint,
} from './utils/types'
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
  createBox,
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

    const size = 0.02
    const box = createBox(
      { x: size * 10, y: size, z: size },
      { x: size * 8, y: size * 1, z: size * 8 }
    )
    addToThreeScene(box, 0xff8888)
    // box.AddForce(new Jolt.Vec3(0, 80, 0))
    box.AddTorque(new Jolt.Vec3(0, 100, 0))

    // Blueprint for minimal skeleton: upper arm and lower arm
    const blueprint: RootPartBlueprint = {
      id: 'h-1',
      name: 'chest',

      // position: { x: 0, y: 0.5, z: 0 },
      // size: { l: 0.18, w: 0.25, t: 0.08, r: 0 },
      position: { x: 0, y: 0.05, z: 0 },
      size: { l: 0.1, w: 0.1, t: 0.1, r: 0 },
      rotation: { y: 0, p: 0, r: 0 },
      //       children: [
      //         {
      //           name: 'upper-arm',
      //           // symmetrical: true,
      //
      //           size: { l: 0.1, w: 0.1, t: 0.1, r: 0 },
      //           // size: { l: 0.22, w: 0.05, t: 0.04, r: 0 },
      //           joint: {
      //             parentOffset: {
      //               from: { w: 1, l: 1 },
      //               w: 0.04,
      //               l: -0.03,
      //             },
      //             childOffset: { from: { l: -1 }, l: -0.01 },
      //             axis: { y: -120, p: -50, r: -20 },
      //             limits: { y: 120, p: 110, r: 40 },
      //           },
      //           // children: [
      //           //   {
      //           //     name: 'lower-arm',
      //           //     size: { l: 0.22, w: 0.04, t: 0.03, r: 0 },
      //           //     joint: {
      //           //       parentOffset: { from: { l: 1 } },
      //           //       childOffset: { from: { l: -1 } },
      //           //       axis: { p: -80, r: 0 },
      //           //       limits: { p: 80, r: 80 },
      //           //     },
      //           //     // children: [
      //           //     //       {
      //           //     //         name: 'hand',
      //           //     //         size: { l: 0.08, w: 0.04, t: 0.03, r: 0 },
      //           //     //         joint: {
      //           //     //           parentOffset: { from: { l: 1 } },
      //           //     //           childOffset: { from: { l: -1 } },
      //           //     //           axis: { y: 0, p: 0, r: 0 },
      //           //     //           limits: { y: 0, p: 60 },
      //           //     //           maxTorque: 0.05,
      //           //     //         },
      //           //     //       },
      //           //     // ],
      //           //   },
      //           // ],
      //         },
      //       ],
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
    // const timeStep = 1.0 / 30.0
    let pStep = 0

    let t = 0
    setInterval(() => {
      if (pStep) {
        // updatePhysics({}, pStep)
        updatePhysics(parts, pStep)
        // updateJointTorques(parts)
      }

      render(timeStep)

      // if (!off && !bodies['lower-arm'].IsActive()) {
      //   off = true
      //   console.log(t)
      // }

      // t += timeStep * 1000
    }, timeStep * 1000)

    window.onkeydown = (event: KeyboardEvent) => {
      switch (event.key) {
        case '1':
          pStep = timeStep / 10
          break
        case '2':
          pStep = timeStep / 3
          break
        case '3':
          pStep = timeStep
          break
      }
    }

    window.onkeyup = () => {
      pStep = 0
    }
  })
})
