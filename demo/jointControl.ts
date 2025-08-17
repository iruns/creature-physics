import { ICreaturePart } from '../src/@types'
import { axisConfigs } from '../src/constants/axes'

// Store per-part torques to be applied each frame
// Change: Part.torques is Record<string, THREE.Vector3>
export function createJointControls(
  parts: Record<string, ICreaturePart>
) {
  const lCol = document.getElementById(
    'joint-control-col-l'
  )!
  const mCol = document.getElementById(
    'joint-control-col-m'
  )!
  const rCol = document.getElementById(
    'joint-control-col-r'
  )!

  for (const name in parts) {
    const part = parts[name]
    const parent = part.parent!
    const joint = part.joint!
    if (!parent || !joint) continue

    const prefix = name.substring(0, 2)
    const col =
      prefix == 'l_' ? lCol : prefix == 'r_' ? rCol : mCol

    const controlSetDiv = col.appendChild(
      document.createElement('div')
    )
    controlSetDiv.className = 'control-set'

    const label = controlSetDiv.appendChild(
      document.createElement('label')
    )
    label.textContent = name

    const limits = part.bp.joint!.limits

    axisConfigs.forEach(({ jointLabel, jointAxis }) => {
      if (!limits[jointAxis]) return

      const { torqueDirection } = joint

      // Negative button
      const nButton = controlSetDiv.appendChild(
        document.createElement('div')
      )
      nButton.className = jointAxis + 'n'

      nButton.onmousedown = () =>
        (torqueDirection[jointAxis] = -1)
      nButton.onmouseup = nButton.onmouseleave = () =>
        (torqueDirection[jointAxis] = 0)

      // Positive button
      const pButton = controlSetDiv.appendChild(
        document.createElement('div')
      )
      pButton.className = jointAxis + 'p'

      pButton.onmousedown = () =>
        (torqueDirection[jointAxis] = 1)
      pButton.onmouseup = pButton.onmouseleave = () =>
        (torqueDirection[jointAxis] = 0)
    })
  }
}
