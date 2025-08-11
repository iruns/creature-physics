import initJolt from 'jolt-physics'
import blueprint from '../blueprints/simpleHumanTop'
import { IPart } from '../src/@types'
import {
  addToThreeScene,
  camera,
  initRenderer,
  render,
  visualizePart,
} from '../src/utils/visualization'
import {
  initWorld,
  physicsSystem,
  bodyInterface,
  createFloor,
  updatePhysics,
} from './world'
import { createJointControls } from './jointControl'
import Creature from '../src/Creature'
import { initAxes } from '../src/constants/axes'
import ContactHandler from '../src/utils/ContactHandler'
import CreatureWorld from '../src/CreatureWorld'

window.addEventListener('DOMContentLoaded', () => {
  initJolt().then(function (Jolt) {
    const updateables: { update: () => void }[] = []

    initWorld(Jolt)
    CreatureWorld.init(Jolt, physicsSystem, bodyInterface)

    initAxes(Jolt)

    initRenderer()

    ContactHandler.init(Jolt, physicsSystem)

    const floor = createFloor()
    updateables.push(floor)
    ContactHandler.addContactObj(floor)
    addToThreeScene(floor, 0xeeeeee)

    // const size = 0.02
    // const box = createBox(
    //   { x: size, y: size, z: size },
    //   { x: 1, y: size * 1, z: 0 }
    // )
    // updateables.push(box)
    // addContactObj(box)
    // addToThreeScene(box, 0xff8888)
    // box.physicsObj.body.AddForce(new Jolt.Vec3(0, 80, 0))
    // box.physicsObj.body.AddTorque(new Jolt.Vec3(100, 0, 0))

    // Use the blueprint utility
    blueprint.density = 0
    const creature = new Creature({
      position: { x: 0, y: 0.2, z: 0 },
      rotation: { y: 0, p: 0, r: 0 },
      blueprint,
    })
    updateables.push(creature)
    creature.root.applyDown((part) =>
      ContactHandler.addContactObj(part)
    )
    const { parts } = creature

    // Add joint motor sliders UI
    createJointControls(parts)

    // Recursively add bodies to Three.js scene using blueprint and bodies map
    function toInterface(part: IPart) {
      const { children } = part

      // If this part has a joint, visualize its limits at the joint anchor
      const vizObj = visualizePart(part)

      if (children) {
        for (const name in children)
          toInterface(children[name])
      }

      return vizObj
    }

    toInterface(creature.root)

    camera.position.z = 4
    camera.position.y = 1.5

    // Animation loop
    const timeStep = 1.0 / 30.0

    let pStep = 0
    pStep = timeStep

    let t = 0
    setInterval(() => {
      if (pStep) {
        for (let i = 0; i < updateables.length; i++)
          updateables[i].update()

        updatePhysics(pStep)
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
