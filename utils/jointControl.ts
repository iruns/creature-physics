import { Part } from './types'
import { bodyInterface, Jolt } from './world'

// Store per-part torques to be applied each frame
export function createJointControls(
  parts: Record<string, Part>
) {
  let panel = document.getElementById(
    'joint-motor-panel'
  ) as HTMLDivElement | null
  if (!panel) {
    panel = document.createElement('div')
    panel.id = 'joint-motor-panel'
    panel.style.position = 'absolute'
    panel.style.top = '10px'
    panel.style.right = '10px'
    panel.style.background = 'rgba(255,255,255,0.95)'
    panel.style.padding = '12px'
    panel.style.borderRadius = '8px'
    panel.style.zIndex = '1000'
    panel.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
    panel.style.maxWidth = '320px'
    panel.style.fontFamily = 'sans-serif'
    document.body.appendChild(panel)
  } else {
    panel.innerHTML = ''
  }

  const torqueAmount = 0.3 // Adjust for strength

  const axisConfigs: {
    axis: string
    a: number
  }[] = [
    {
      axis: 'Yaw',
      a: 1,
    },
    {
      axis: 'Pitch',
      a: 0,
    },
    {
      axis: 'Roll',
      a: 2,
    },
  ]

  for (const name in parts) {
    const part = parts[name]

    const parent = part.parent!
    const joint = part.joint!

    if (!parent || !joint) continue

    // Initialize per-part torque accumulators if not present
    if (!part.torques) part.torques = {}
    if (!parent.torques) parent.torques = {}

    const jointDiv = panel.appendChild(
      document.createElement('div')
    )
    jointDiv.style.marginBottom = '10px'
    jointDiv.innerHTML = `<div style="margin-bottom:2px;"><b>${name}</b></div>`

    const torqueVec3: [number, number, number] = [0, 0, 0]
    function update() {
      bodyInterface.ActivateConstraint(joint)

      // Compute torque in local part space, then rotate to world space
      const partQuat = part.body.GetRotation()

      // Convert torqueVec3 (local) to world
      const qx = partQuat.GetX(),
        qy = partQuat.GetY(),
        qz = partQuat.GetZ(),
        qw = partQuat.GetW()

      // Quaternion-vector multiplication (q * v * q^-1)
      const x = torqueVec3[0],
        y = torqueVec3[1],
        z = torqueVec3[2]

      // Calculate q * v
      const ix = qw * x + qy * z - qz * y
      const iy = qw * y + qz * x - qx * z
      const iz = qw * z + qx * y - qy * x
      const iw = -qx * x - qy * y - qz * z

      // Calculate result = (q * v) * q^-1
      const wx = ix * qw + iw * -qx + iy * -qz - iz * -qy
      const wy = iy * qw + iw * -qy + iz * -qx - ix * -qz
      const wz = iz * qw + iw * -qz + ix * -qy - iy * -qx
      const worldTorque: [number, number, number] = [
        wx,
        wy,
        wz,
      ]

      // Assign to both part and parent torque accumulators, keyed by child part name
      part.torques[name] = worldTorque
      parent.torques[name] = [-wx, -wy, -wz]
    }

    axisConfigs.forEach(({ axis, a }) => {
      const axisDiv = jointDiv.appendChild(
        document.createElement('div')
      )
      axisDiv.style.display = 'flex'
      axisDiv.style.alignItems = 'center'
      axisDiv.style.marginBottom = '4px'
      axisDiv.style.gap = '8px'
      axisDiv.style.width = '100%'

      // Left button
      const leftButton = axisDiv.appendChild(
        document.createElement('button')
      )
      leftButton.textContent = '<'
      leftButton.style.flex = '0 0 auto'
      leftButton.style.marginRight = '0'
      leftButton.onmousedown = () => {
        torqueVec3[a] = -torqueAmount
        update()
      }
      leftButton.onmouseup = leftButton.onmouseleave =
        () => {
          torqueVec3[a] = 0
          update()
        }

      // Axis label (centered)
      const label = axisDiv.appendChild(
        document.createElement('span')
      )
      label.textContent = axis
      label.style.flex = '1 1 auto'
      label.style.textAlign = 'center'
      label.style.fontWeight = 'bold'

      // Right button
      const rightButton = axisDiv.appendChild(
        document.createElement('button')
      )
      rightButton.textContent = '>'
      rightButton.style.flex = '0 0 auto'
      rightButton.onmousedown = () => {
        torqueVec3[a] = torqueAmount
        update()
      }
      rightButton.onmouseup = rightButton.onmouseleave =
        () => {
          torqueVec3[a] = 0
          update()
        }
    })
  }
}

// Call this before physics update each frame
type Vec3Arr = [number, number, number]
export function updateJointTorques(
  parts: Record<string, Part>
) {
  for (const name in parts) {
    const part = parts[name]
    if (!part.torques) continue
    // Sum all torques assigned to this part
    let sum: Vec3Arr = [0, 0, 0]

    for (const key in part.torques) {
      const t = part.torques[key]
      sum[0] += t[0]
      sum[1] += t[1]
      sum[2] += t[2]
    }
    // Apply the summed torque
    if (sum[0] !== 0 || sum[1] !== 0 || sum[2] !== 0) {
      part.body.AddTorque(
        new Jolt.Vec3(sum[0], sum[1], sum[2])
      )
    }
    // Clear for next frame
    // part.torques = {}
  }
}
