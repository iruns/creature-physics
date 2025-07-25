import * as THREE from 'three'

// Helper to convert degrees to radians
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function rotateByAxis(
  quat: THREE.Quaternion,
  axis: THREE.Vector3,
  angle: number
): void {
  quat.multiply(
    new THREE.Quaternion().setFromAxisAngle(
      axis.normalize(),
      angle
    )
  )
}

export function quaternionFromYPR(
  yaw = 0,
  pitch = 0,
  roll = 0
): THREE.Quaternion {
  let quaternion = new THREE.Quaternion(0, 0, 0, 1)

  rotateByAxis(
    quaternion,
    new THREE.Vector3(0, 1, 0),
    degToRad(yaw)
  )
  rotateByAxis(
    quaternion,
    new THREE.Vector3(1, 0, 0),
    degToRad(pitch)
  )
  rotateByAxis(
    quaternion,
    new THREE.Vector3(0, 0, 1),
    degToRad(roll)
  )

  return quaternion
}
