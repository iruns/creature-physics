import { IPart } from '../src/@types'
import { axisConfigs } from '../src/constants/axes'

// Store per-part torques to be applied each frame
// Change: Part.torques is Record<string, THREE.Vector3>
export function createJointControls(
  parts: Record<string, IPart>,
  parentEl: HTMLElement = document.body
) {
  const panel = document.createElement('div')
  panel.id = 'joint-motor-panel'
  const panelStyle = panel.style
  panelStyle.position = 'absolute'
  panelStyle.top = '10px'
  panelStyle.right = '10px'

  panelStyle.background = 'rgba(255, 255, 255,0.8)'
  panelStyle.padding = '12px'
  panelStyle.maxWidth = '320px'
  panelStyle.zIndex = '1000'

  panelStyle.fontSize = '11px'
  panelStyle.fontFamily = 'sans-serif'

  parentEl.appendChild(panel)

  for (const name in parts) {
    const part = parts[name]
    const parent = part.parent!
    const joint = part.joint!
    if (!parent || !joint) continue

    const jointDiv = panel.appendChild(
      document.createElement('div')
    )
    jointDiv.style.marginBottom = '10px'
    jointDiv.innerHTML = `<div style="margin-bottom:2px;"><b>${name}</b></div>`

    const limits = part.bp.joint!.limits

    axisConfigs.forEach(({ jointLabel, jointAxis }) => {
      if (!limits[jointAxis]) return

      const axisDiv = jointDiv.appendChild(
        document.createElement('div')
      )
      axisDiv.style.display = 'flex'
      axisDiv.style.alignItems = 'center'
      axisDiv.style.marginBottom = '4px'
      axisDiv.style.gap = '8px'
      axisDiv.style.width = '100%'

      const { torqueDirection } = joint

      // Left button
      const leftButton = axisDiv.appendChild(
        document.createElement('button')
      )
      leftButton.textContent = '<'
      leftButton.style.flex = '0 0 auto'

      leftButton.onmousedown = () =>
        (torqueDirection[jointAxis] = -1)
      leftButton.onmouseup = leftButton.onmouseleave = () =>
        (torqueDirection[jointAxis] = 0)

      // Axis label (centered)
      const labelDiv = axisDiv.appendChild(
        document.createElement('span')
      )
      labelDiv.textContent = jointLabel
      labelDiv.style.flex = '1 1 auto'
      labelDiv.style.textAlign = 'center'
      labelDiv.style.fontWeight = 'bold'

      // Right button
      const rightButton = axisDiv.appendChild(
        document.createElement('button')
      )
      rightButton.textContent = '>'
      rightButton.style.flex = '0 0 auto'

      rightButton.onmousedown = () =>
        (torqueDirection[jointAxis] = 1)
      rightButton.onmouseup = rightButton.onmouseleave =
        () => (torqueDirection[jointAxis] = 0)
    })
  }
}
