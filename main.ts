import * as THREE from 'three'
import initJolt from 'jolt-physics'
import { Part, PartBlueprint } from './utils/types'
import { buildRagdollFromBlueprint } from './utils/creatureBuilder'
import {
  addToThreeScene,
  camera,
  initRenderer,
  render,
  visualizeJointLimits,
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

    // Blueprint for minimal skeleton: upper arm and lower arm
    const blueprint: PartBlueprint = {
      name: 'upper-arm',
      shape: new Jolt.BoxShape(
        new Jolt.Vec3(0.1, 0.05, 0.2)
      ),
      // shape: new Jolt.CapsuleShape(0.15, 0.06),
      position: [0, 0.5, 0],
      // position: [0, 0.6, 0],
      rotation: { y: 0, p: 0, r: 0 },
      children: [
        {
          name: 'lower-arm',
          // shape: new Jolt.CapsuleShape(0.15, 0.05),
          shape: new Jolt.BoxShape(
            new Jolt.Vec3(0.02, 0.02, 0.1)
          ),
          joint: {
            // 1
            parentOffset: [0, 0, 0.2],
            childOffset: [0, 0, -0.1],
            axis: { y: 0, p: 0, r: 0 },
            limits: { y: 30, p: 60 },
            maxTorque: 5,
          },
          children: [
            {
              name: 'lower-arm-end',
              // shape: new Jolt.CapsuleShape(0.15, 0.05),
              shape: new Jolt.BoxShape(
                new Jolt.Vec3(0.02, 0.02, 0.1)
              ),
              joint: {
                // 1
                parentOffset: [0, 0, 0.1],
                childOffset: [0, 0, -0.1],
                axis: { y: 0, p: 0, r: 0 },
                limits: { r: 60 },
                maxTorque: 0.1,
              },
              children: [
                {
                  name: 'hand',
                  // shape: new Jolt.CapsuleShape(0.15, 0.05),
                  shape: new Jolt.BoxShape(
                    new Jolt.Vec3(0.03, 0.02, 0.04)
                  ),
                  joint: {
                    // 1
                    parentOffset: [0, 0, 0.1],
                    childOffset: [0, 0, -0.04],
                    axis: { y: 0, p: 0, r: 0 },
                    limits: { y: 0, p: 60 },
                    maxTorque: 0.05,
                  },
                },
              ],
            },
          ],
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
    const threeObjs: Record<string, THREE.Mesh> = {}
    function toInterface(part: Part) {
      const { bp, parent, children, body } = part

      const threeObj = addToThreeScene(body, 0xff00ff)
      threeObj.traverse((obj: any) => {
        if (obj.material) {
          obj.material.transparent = true
          obj.material.opacity = 0.3
          obj.material.depthWrite = false
        }
      })
      threeObjs[bp.name] = threeObj

      // If this part has a joint, visualize its limits at the joint anchor
      if (parent && bp.joint) {
        visualizeJointLimits(
          threeObjs[parent.bp.name],
          bp.joint
        )
      }

      if (children) {
        for (const name in children)
          toInterface(children[name])
      }
    }
    toInterface(creature)

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
