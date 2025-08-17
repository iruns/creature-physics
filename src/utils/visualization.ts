import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/Addons.js'
import {
  ICreaturePart,
  Contact,
  Obj3dShapeType,
  VizUserObj,
  IObj3D,
  IJoint,
} from '../@types'
import {
  PartAxis,
  JointAxis,
  JointAxisVec3,
} from '../@types/axes'
import { degToRad, exponentiate } from './math'
import { partToThreeAxis } from './vector'

export let container: HTMLElement
export let scene: THREE.Scene
export let renderer: THREE.WebGLRenderer
export let camera: THREE.PerspectiveCamera
export let controls: OrbitControls

export const threeObjs: VizUserObj[] = []

const colors = {
  t_y: 0x0000ff,
  w_p: 0xff0000,
  l_r: 0x00ff00,
} as any as Record<string, number> &
  Record<PartAxis, number> &
  Record<JointAxis, number>

colors.t = colors.t_y
colors.y = colors.t_y
colors.w = colors.w_p
colors.p = colors.w_p
colors.l = colors.l_r
colors.r = colors.l_r
colors.swing = colors.t_y + colors.w_p

export function initRenderer() {
  container = document.getElementById('container')!
  container.innerHTML = ''

  renderer = new THREE.WebGLRenderer()
  renderer.setClearColor(0xbfd1e5)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true // Enable shadow mapping
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  // camera = new THREE.PerspectiveCamera(
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.2,
    2000
  )
  camera.position.set(0, 0, 0)
  camera.lookAt(new THREE.Vector3(0, 0, 0))

  scene = new THREE.Scene()

  const dirLight = new THREE.DirectionalLight(0xffffff, 1)
  dirLight.position.set(10, 10, 5)
  dirLight.castShadow = true // Enable shadow casting for the light
  dirLight.shadow.mapSize.width = 2048
  dirLight.shadow.mapSize.height = 2048
  dirLight.shadow.camera.near = 0.5
  dirLight.shadow.camera.far = 50
  scene.add(dirLight)

  controls = new OrbitControls(camera, container)
  container.appendChild(renderer.domElement)

  // Restore camera state if present
  const saved = localStorage.getItem('cameraState')
  // const saved = '{}'

  if (saved) {
    try {
      const { position, target, zoom } = JSON.parse(saved)
      controls.target0.copy(target)
      controls.position0.copy(position)
      controls.zoom0 = zoom

      // apply after other things are settled
      // otherwise will get overridden
      setTimeout(() => {
        controls.reset()
        controls.saveState()
      }, 1)
    } catch (e) {
      // Ignore parse errors
    }
  }

  // Save camera state on before unload
  window.addEventListener('beforeunload', () => {
    controls.saveState()
    const state = {
      target: controls.target0,
      position: controls.position0,
      zoom: controls.zoom0,
    }
    localStorage.setItem(
      'cameraState',
      JSON.stringify(state)
    )
  })

  window.addEventListener('resize', onWindowResize, false)
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

// Add

// Add a Jolt body to the world scene and dynamicObjects
export function addToThreeScene(
  obj: IObj3D,
  vizRadius = 0
): VizUserObj {
  const { size, shapeType, color = 0x9999999 } = obj.bp
  const { x, y, z } = size

  const material = new THREE.MeshPhongMaterial({ color })
  let geometry: THREE.BufferGeometry
  const r = x / 2
  switch (shapeType) {
    case Obj3dShapeType.Sphere:
      geometry = new THREE.SphereGeometry(r)
      break
    case Obj3dShapeType.Cylinder:
      geometry = new THREE.CylinderGeometry(r, r, y)
      break
    case Obj3dShapeType.Capsule:
      geometry = new THREE.CapsuleGeometry(r, y)
      break
    default:
      geometry = new THREE.BoxGeometry(x, y, z)
      break
  }

  const mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)

  const threeObj: VizUserObj = {
    mesh,
    obj,
    vizRadius,
    axes: new THREE.AxesHelper(vizRadius),
  }

  threeObjs.push(threeObj)
  obj.vizObj = threeObj

  return threeObj
}

export function visualizePart(
  part: ICreaturePart
): VizUserObj {
  const {
    bp: {
      size,
      obj: { shapeType },
      joint: jointBp,
    },
  } = part

  // set radius to be used in visualizations
  let vizRadius = 0
  switch (shapeType) {
    case Obj3dShapeType.Sphere:
    case Obj3dShapeType.Cylinder:
    case Obj3dShapeType.Capsule:
      vizRadius = size.w ?? size.l
      break
    default:
      vizRadius =
        Math.max(size.w ?? 0, size.t ?? 0) ?? size.l
      break
  }

  const threeObj = addToThreeScene(part.obj, vizRadius)
  threeObj.part = part

  const { mesh } = threeObj

  mesh.traverse((obj: any) => {
    if (obj.material) {
      obj.material.transparent = true
      obj.material.opacity = 0.5
      obj.material.depthWrite = false
    }
  })

  // If doesn't have radius (not a Part), just return the minimum
  if (!vizRadius) return threeObj

  // Add axes
  const axes = (threeObj.axes = new THREE.AxesHelper(
    vizRadius
  ))
  mesh.add(axes)
  axes.rotateX(degToRad(-90))

  if (!jointBp) return threeObj

  // If has joint, modify further
  axes.position.copy(jointBp.childOffset.baked)

  threeObj.torque = {}
  threeObj.lambda = {}
  const { torque, lambda } = threeObj

  const { y, p, r } = jointBp.limits

  const limitRadius = vizRadius * 1

  const parentMesh = part.parent?.obj.vizObj?.mesh

  // if y and/or p
  if (y || p) {
    // Convert all angles from degrees to radians for geometry
    const pHalfConeRad = p ? degToRad(p) : 0
    const yHalfConeRad = y ? degToRad(y) : 0

    let color = colors.swing
    const swingSegments = 8
    const swingVertices: number[] = []
    swingVertices.push(0, 0, 0) // cone / semi-circle tip at origin
    let segmentRad = 0

    // Elliptical cone
    if (y && p) {
      segmentRad = (2 * Math.PI) / swingSegments

      const pLimitX = Math.sin(pHalfConeRad) * limitRadius
      const pLimitY = Math.cos(pHalfConeRad) * limitRadius
      const yLimitX = Math.sin(yHalfConeRad) * limitRadius
      const yLimitY = Math.cos(yHalfConeRad) * limitRadius

      for (let i = 0; i <= swingSegments; i++) {
        const theta = i * segmentRad

        const pWeight = Math.cos(theta)
        const yWeight = Math.sin(theta)
        const absPWeight = Math.abs(pWeight)
        const absYWeight = Math.abs(yWeight)

        const x = yLimitX * yWeight
        const z = pLimitX * pWeight
        const y =
          (pLimitY * absPWeight + yLimitY * absYWeight) /
          (absPWeight + absYWeight)
        swingVertices.push(x, y, z)
      }
    } else {
      let halfConeRad = yHalfConeRad
      color = colors.y
      if (p) {
        halfConeRad = pHalfConeRad
        color = colors.p
      }

      const angle0 = degToRad(90) - halfConeRad
      segmentRad = (halfConeRad * 2) / swingSegments

      for (let i = 0; i <= swingSegments; i++) {
        const theta = angle0 + i * segmentRad

        const pWeight = Math.cos(theta)
        const yWeight = Math.sin(theta)

        // Elliptical radii
        const x = limitRadius * pWeight
        const y = limitRadius * yWeight
        if (p) swingVertices.push(0, y, x)
        else swingVertices.push(x, y, 0)
      }
    }

    // Indices for triangle fan
    const swingIndices: number[] = []
    for (let i = 1; i <= swingSegments; i++) {
      swingIndices.push(0, i, i + 1)
    }

    const swingGeometry = new THREE.BufferGeometry()
    swingGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(swingVertices, 3)
    )
    swingGeometry.setIndex(swingIndices)
    swingGeometry.computeVertexNormals()

    const swingMaterial = new THREE.MeshBasicMaterial({
      color,
      wireframe: true,
      opacity: 0.5,
      transparent: true,
    })
    const swingMesh = new THREE.Mesh(
      swingGeometry,
      swingMaterial
    )

    swingMesh.position.copy(jointBp.parentOffset.baked)
    swingMesh.quaternion.copy(jointBp.rotation)

    parentMesh!.add(swingMesh)
  }

  // if r
  if (r) {
    // Twist arc (partial ring)
    const twistSegments = 8
    const twistGeometry = new THREE.BufferGeometry()
    const twistVertices: number[] = []

    const twistRad = degToRad(r)

    // Add center point
    twistVertices.push(0, 0, 0)
    for (let i = 0; i <= twistSegments; i++) {
      const angle =
        -twistRad + (i / twistSegments) * (twistRad * 2)
      const x = Math.cos(angle) * limitRadius
      const y = 0
      const z = Math.sin(angle) * limitRadius
      twistVertices.push(x, y, z)
    }
    twistVertices.push(0, 0, 0)
    twistGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(twistVertices, 3)
    )

    const twistMaterial = new THREE.LineBasicMaterial({
      color: colors.r,
      opacity: 0.7,
      transparent: true,
    })
    // Use Line instead of LineLoop to connect center to arc
    const twistArc = new THREE.Line(
      twistGeometry,
      twistMaterial
    )
    twistArc.position.copy(jointBp.parentOffset.baked)
    twistArc.quaternion.copy(jointBp.rotation)

    parentMesh!.add(twistArc)
  }

  // forces & lambda
  const forceSize = vizRadius * 1
  for (const key in jointBp.limits) {
    const axis = key as JointAxis
    const limit = jointBp.limits[axis]
    if (limit) {
      const direction = partToThreeAxis(
        axis === 'y' ? 'w' : axis === 'p' ? 't' : 't'
      )
      const forceOrigin = partToThreeAxis(
        axis === 'y' ? 'l' : axis === 'p' ? 'l' : 'w'
      )
        .multiplyScalar(limitRadius * 0.4)
        .add(jointBp.childOffset.baked)

      const forceArrow = (torque[axis] =
        new THREE.ArrowHelper(
          direction,
          forceOrigin,
          forceSize,
          colors[axis]
        ))

      mesh.add(forceArrow)
      forceArrow.scale.set(0, 0, 0)

      const lambdaOrigin = partToThreeAxis(
        axis === 'y' ? 'l' : axis === 'p' ? 'l' : 'w'
      )
        .multiplyScalar(limitRadius * 0.2)
        .add(jointBp.childOffset.baked)
      const lambdaArrow = (lambda[axis] =
        new THREE.ArrowHelper(
          direction,
          lambdaOrigin,
          forceSize,
          colors[axis]
        ))

      mesh.add(lambdaArrow)
      lambdaArrow.scale.set(0, 0, 0)
    }
  }

  return threeObj
}

// Update

export function render(deltaTime: number) {
  const allContacts: Contact[] = []

  for (let i = 0; i < threeObjs.length; i++) {
    const vizObj = threeObjs[i]

    const { mesh, obj, part } = vizObj
    if (!obj) continue

    const { position, rotation, contacts } = obj

    mesh.position.copy(position)
    mesh.quaternion.copy(rotation)

    allContacts.push(...contacts)

    // if has joint, update the force arrows
    if (!part) continue
    const { joint } = part
    if (vizObj?.torque && vizObj?.lambda && joint)
      updateJointForces(joint, vizObj.torque, vizObj.lambda)
  }

  // Contacts
  updateContacts(allContacts)

  // Camera
  controls.update(deltaTime)

  renderer.render(scene, camera)
}

function updateJointForces(
  joint: IJoint,
  torque: Partial<JointAxisVec3<THREE.ArrowHelper>>,
  lambda: Partial<JointAxisVec3<THREE.ArrowHelper>>
) {
  const { torque: torqueVals, lambda: lambdaVals } = joint

  for (const key in torque) {
    const jointAxis = key as JointAxis
    let forceScale = -exponentiate(
      torqueVals[jointAxis],
      0.3
    )
    let lambdaScale = -exponentiate(
      lambdaVals[jointAxis],
      0.3
    )

    // flip direction for p axis (for some reason)
    if (jointAxis === 'p') {
      forceScale = -forceScale
      lambdaScale = -lambdaScale
    }

    const torqueArrow = torque[
      jointAxis
    ] as THREE.ArrowHelper
    torqueArrow.scale.set(
      forceScale,
      forceScale,
      forceScale
    )

    const lambdaArrow = lambda[
      jointAxis
    ] as THREE.ArrowHelper
    lambdaArrow.scale.set(
      lambdaScale,
      lambdaScale,
      lambdaScale
    )
  }
}

const contactMeshes: THREE.Mesh[] = []
const contactMaterial = new THREE.MeshBasicMaterial({
  color: new THREE.Color().setRGB(1, 0.4, 0),
  transparent: true,
  opacity: 0.6,
})
function updateContacts(contacts: Contact[]) {
  for (
    let i = contacts.length;
    i < contactMeshes.length;
    i++
  ) {
    scene.remove(contactMeshes[i])
  }
  contactMeshes.length = contacts.length

  for (let i = 0; i < contacts.length; i++) {
    let contactMesh = contactMeshes[i]
    if (!contactMesh) {
      contactMeshes[i] = contactMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 8, 4),
        contactMaterial
      )
      scene.add(contactMesh)
    }
    1
    const { worldPosition, strength } = contacts[i]
    contactMesh.position.copy(worldPosition)

    const scale = strength ** 0.3
    contactMesh.scale.set(scale, scale, scale)
  }
}
