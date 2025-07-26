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
import { createJointControls } from './utils/jointControl'

window.addEventListener('DOMContentLoaded', () => {
  initJolt().then(function (Jolt) {
    initRenderer()
    initWorld(Jolt)

    const floorBody = createFloor()
    addToThreeScene(floorBody, 0x888888)

    // Timers
    const clock = new THREE.Clock()
    let time = 0

    // Blueprint for minimal skeleton: upper arm and lower arm
    const blueprint: PartBlueprint = {
      name: 'Upper-Arm',
      shape: new Jolt.BoxShape(
        new Jolt.Vec3(0.1, 0.05, 0.2)
      ),
      // shape: new Jolt.CapsuleShape(0.15, 0.06),
      position: [0, 0.6, 0],
      yprRotation: [0, -20, 0],
      children: [
        {
          name: 'Lower-Arm',
          // shape: new Jolt.CapsuleShape(0.15, 0.05),
          shape: new Jolt.BoxShape(
            new Jolt.Vec3(0.02, 0.05, 0.2)
          ),
          joint: {
            // 1
            parentOffset: [0, 0, 0.2],
            childOffset: [0, 0, -0.2],
            yprAxes: [10, 40, 20],
            yprLimits: [40, 90, 20],
          },
          children: [
            {
              name: 'Hand',
              // shape: new Jolt.CapsuleShape(0.15, 0.05),
              shape: new Jolt.BoxShape(
                new Jolt.Vec3(0.01, 0.02, 0.1)
              ),
              joint: {
                // 1
                parentOffset: [0, 0, 0.2],
                childOffset: [0, 0, -0.1],
                yprAxes: [10, 40, 0],
                yprLimits: [40, 90, 20],
              },
            },
          ],
        },
      ],
    }

    // Use the blueprint utility
    const { creature, ragdoll, bodies, joints } =
      buildRagdollFromBlueprint(blueprint, physicsSystem, 1)

    if (!ragdoll) return

    // Add joint motor sliders UI
    createJointControls(
      Object.entries(joints).map(([name, joint]) => ({
        name,
        joint,
      }))
    )

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
    function animate() {
      requestAnimationFrame(animate)

      let deltaTime = clock.getDelta()
      deltaTime = Math.min(deltaTime, 1.0 / 30.0)

      updatePhysics(deltaTime)
      render(deltaTime)
    }
    animate()
  })
})
