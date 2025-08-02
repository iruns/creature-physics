import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/Addons.js'
import type JoltType from 'jolt-physics'
import { Jolt } from './world'
import {
  Part,
  RSet,
  PartViz,
  YPSet,
  PartAxis,
  JointAxis,
} from './types'
import {
  degToRad,
  exponentiate,
  jointToThreeAxis,
  partToThreeAxis,
  toThreeQuat,
  toThreeVec3,
} from './math'

export let container: HTMLElement
export let scene: THREE.Scene
export let renderer: THREE.WebGLRenderer
export let camera: THREE.PerspectiveCamera
export let controls: OrbitControls

export const meshes: THREE.Mesh[] = []

export function initRenderer() {
  container = document.getElementById('container')!
  container.innerHTML = ''

  renderer = new THREE.WebGLRenderer()
  renderer.setClearColor(0xbfd1e5)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true // Enable shadow mapping
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.2,
    2000
  )
  // camera.position.set(0, 0, 0)
  // camera.lookAt(new THREE.Vector3(0, 0, 0))

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

// Create a Three.js mesh for a Jolt shape
export function createMeshForShape(
  shape: JoltType.Shape
): THREE.BufferGeometry {
  let scale = new Jolt.Vec3(1, 1, 1)
  let triContext = new Jolt.ShapeGetTriangles(
    shape,
    Jolt.AABox.prototype.sBiggest(),
    shape.GetCenterOfMass(),
    Jolt.Quat.prototype.sIdentity(),
    scale
  )
  Jolt.destroy(scale)

  let vertices = new Float32Array(
    Jolt.HEAPF32.buffer,
    triContext.GetVerticesData(),
    triContext.GetVerticesSize() /
      Float32Array.BYTES_PER_ELEMENT
  )
  let buffer = new THREE.BufferAttribute(
    vertices,
    3
  ).clone()
  Jolt.destroy(triContext)

  let geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', buffer)
  geometry.computeVertexNormals()
  return geometry
}

export function render(deltaTime: number) {
  for (let i = 0; i < meshes.length; i++) {
    const mesh = meshes[i]
    const body = mesh.userData.body as JoltType.Body

    if (!body) continue

    mesh.position.copy(
      toThreeVec3(
        new Jolt.Vec3(
          body.GetPosition().GetX(),
          body.GetPosition().GetY(),
          body.GetPosition().GetZ()
        )
      )
    )
    mesh.quaternion.copy(toThreeQuat(body.GetRotation()))

    // if has joint, update the arrows
    const partViz = mesh as PartViz
    const { part, torque } = partViz.userData
    if (!part) continue

    const joint = part.joint
    if (!joint) continue

    for (const key in torque) {
      const jointAxis = key as JointAxis
      let scale = -exponentiate(part.torque[jointAxis], 0.5)
      // flip torque direction for p axis (for some reason)
      if (jointAxis === 'p') scale = -scale
      const arrow = torque[jointAxis] as THREE.ArrowHelper
      arrow.scale.set(scale, scale, scale)

      // console.log(
      //   joint.GetTotalLambdaMotorRotation().GetZ()
      // )
    }
  }
  controls.update(deltaTime)
  renderer.render(scene, camera)
}

// Create a Three.js mesh for a Jolt body
export function getThreeMeshForBody(
  body: JoltType.Body,
  color: number
): THREE.Mesh {
  // Main solid mesh with shadows
  const material = new THREE.MeshPhongMaterial({ color })
  const shape = body.GetShape()
  const geometry = createMeshForShape(shape)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true

  // Wireframe overlay (no shadows, always on top)
  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    wireframe: true,
    depthTest: true, // set to false if you want it always visible
    transparent: true,
    opacity: 0.5,
  })
  const wireframeMesh = new THREE.Mesh(
    geometry,
    wireframeMaterial
  )
  wireframeMesh.castShadow = false
  wireframeMesh.receiveShadow = false
  mesh.add(wireframeMesh)

  return mesh
}

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

// Add a Jolt body to the world scene and dynamicObjects
export function addToThreeScene(
  body: JoltType.Body,
  color: number
) {
  const mesh = getThreeMeshForBody(body, color)

  mesh.userData.body = body
  scene.add(mesh)
  meshes.push(mesh)

  return mesh
}

export function visualizePart(
  part: Part,
  parent?: PartViz
): PartViz {
  const {
    bp: { color, joint: jointBp },
    body,
  } = part

  const mesh = addToThreeScene(body, color)

  mesh.traverse((obj: any) => {
    if (obj.material) {
      obj.material.transparent = true
      obj.material.opacity = 0.9
      obj.material.depthWrite = false
    }
  })

  const partViz: PartViz = Object.assign(mesh, {
    userData: {
      parent,
      part,
      body,
      torque: {},
    },
  })
  const { userData } = partViz

  // Optionally: add axes helper at joint
  const axes = new THREE.AxesHelper(0.1)

  partViz.add(axes)

  if (!parent || !jointBp) return partViz

  axes.position.copy(jointBp.childOffset.baked)
  axes.quaternion.copy(jointBp.rotation)

  const parentViz = parent

  const { y, p, r } = jointBp.limits as YPSet & RSet

  const limitRadius = part.vizRadius * 3

  // if y & p
  if (r == undefined) {
    // Convert all angles from degrees to radians for geometry
    const normalHalfConeRad = degToRad(p)
    const planeHalfConeRad = degToRad(y)

    // Swing cone (elliptical, partial)
    const swingSegments = 16
    const swingVertices: number[] = []
    swingVertices.push(0, 0, 0) // cone tip at origin
    const segmentRad = (2 * Math.PI) / swingSegments

    const normalLimitX =
      Math.sin(normalHalfConeRad) * limitRadius
    const normalLimitY =
      Math.cos(normalHalfConeRad) * limitRadius
    const planeLimitX =
      Math.sin(planeHalfConeRad) * limitRadius
    const planeLimitY =
      Math.cos(planeHalfConeRad) * limitRadius

    for (let i = 0; i <= swingSegments; i++) {
      const theta = i * segmentRad

      const normalWeight = Math.cos(theta)
      const planeWeight = Math.sin(theta)
      const absNormalWeight = Math.abs(normalWeight)
      const absPlaneWeight = Math.abs(planeWeight)

      // Elliptical radii
      const x = planeLimitX * planeWeight
      const z = normalLimitX * normalWeight
      const y =
        (normalLimitY * absNormalWeight +
          planeLimitY * absPlaneWeight) /
        (absNormalWeight + absPlaneWeight)
      swingVertices.push(x, y, z)
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
      color: !y ? colors.p : !p ? colors.y : colors.swing,
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
    parentViz.add(swingMesh)
  }

  // if r
  else {
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

    parentViz.add(twistArc)
  }

  // forces
  const forceSize = part.vizRadius * 2
  for (const key in jointBp.limits) {
    const axis = key as JointAxis
    const limit = jointBp.limits[axis]
    if (limit) {
      const direction = partToThreeAxis(
        axis === 'y' ? 'w' : axis === 'p' ? 't' : 't'
      )
      const origin = partToThreeAxis(
        axis === 'y' ? 'l' : axis === 'p' ? 'l' : 'w',
        limitRadius * 0.4
      ).add(jointBp.childOffset.baked)
      const arrow = (userData.torque[axis] =
        new THREE.ArrowHelper(
          direction,
          origin,
          forceSize,
          colors[axis]
        ))

      partViz.add(arrow)
    }
  }

  // console.log(joint.GetTotalLambdaMotorRotation().GetZ())

  return partViz
}
