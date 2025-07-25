- [v] fix limits to be able to show large limits
- [v] check the order of twist and swing

  - [v] limits are changed by twist
  - [v] motor orientations are change by twist

- [v] fix the motor control

  - [v] to 2 buttons
  - [v] vertical layout
  - [v] actual motor effect

- [v] create creature by blueprint

- [v] correctly translate axes to limits

- [v] blueprint should be relative

  - [v] make children start at relaxed rotation (middle of limits)
  - [v] use yaw, pitch, and roll
  - [v] get local positions of joint, then offset so they're at the same world position

- [_] change from motor to direct application of force

  - [_] turn off the motor

- [_] visualize motor force
- [_] visualize other forces

- [_] split part bp size and shape variables
- [_] use bp size to set the viz size

- [_] symmetry

- [_] relaxing forces
- [_] limit forces

- [_] customize

  - [_] mass
  - [_] material

- check for swing and twist only joint types

  - twist-only might be replaced by HingeConstraint

======

| Joint Name  | Parent      | Twist Axis | Twist Angle | Normal Angle | Plane Angle | Notes               |
| ----------- | ----------- | ---------- | ----------- | ------------ | ----------- | ------------------- |
| LowerBody   | -1          | -          | -           | -            | -           | Root, no constraint |
| MidBody     | LowerBody   | Y          | 5°          | 10°          | 10°         | Spine               |
| UpperBody   | MidBody     | Y          | 5°          | 10°          | 10°         | Spine               |
| Head        | UpperBody   | Y          | 90°         | 45°          | 45°         | Head                |
| UpperArmL/R | UpperBody   | X          | 45°         | 90°          | 45°         | Shoulder            |
| LowerArmL/R | UpperArmL/R | -X/X       | 45°         | 0°           | 90°         | Elbow               |
| UpperLegL/R | LowerBody   | -Y/-Y      | 45°         | 45°          | 45°         | Hip                 |
| LowerLegL/R | UpperLegL/R | -Y/-Y      | 45°         | 0°           | 60°         | Knee                |
