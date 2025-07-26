import { bodyInterface, Jolt } from './world'
import JoltType from 'jolt-physics'

export function createJointControls(
  joints: Array<{
    name: string
    joint: JoltType.SwingTwistConstraint
  }>
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

  const speed = 1

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
      a: 2,
    },
    {
      axis: 'Roll',
      a: 0,
    },
  ]

  joints.forEach(({ name, joint }) => {
    const jointDiv = panel.appendChild(
      document.createElement('div')
    )
    jointDiv.style.marginBottom = '10px'
    jointDiv.innerHTML = `<div style="margin-bottom:2px;"><b>${name}</b></div>`

    const speedVec3: [number, number, number] = [0, 0, 0]
    function update() {
      bodyInterface.ActivateConstraint(joint)
      joint.SetTargetAngularVelocityCS(
        new Jolt.Vec3(...speedVec3)
      )
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
        speedVec3[a] = -speed
        update()
      }
      leftButton.onmouseup = leftButton.onmouseleave =
        () => {
          speedVec3[a] = 0
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
        speedVec3[a] = speed
        update()
      }
      rightButton.onmouseup = rightButton.onmouseleave =
        () => {
          speedVec3[a] = 0
          update()
        }
    })
  })
}
