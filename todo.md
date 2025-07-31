- [x] fix limits to be able to show large limits
- [x] check the order of twist and swing

  - [x] limits aren't changed by twist
  - [x] motor orientations are changed by twist

- [x] fix the motor control

  - [x] to 2 buttons
  - [x] vertical layout
  - [x] actual motor effect

- [x] create creature by blueprint

- [x] correctly translate axes to limits

- [x] blueprint should be relative

  - [x] make children start at relaxed rotation (middle of limits)
  - [x] use yaw, pitch, and roll
  - [x] get local positions of joint, then offset so they're at the same world position

- [x] use motor 6-DoF Joints

  - [x] apply motor torque
  - [x] always apply motor torque towards relaxed position, much stronger nearer limit
  - [x] determine target velocity by prevailing torque direction

  - [x] refactor to apply to each axis

  - [x] create 2 types of joints (from the 6-DoF): swing & roll
  - [x] reactivate the centering force
    - only at near limitis, very strong at limit
    - otherwise should turn off motor to use the friction (should be high)

- [x] split part bp size and shape variables
- [x] use bp size to set the viz size

- [ ] visualize motor force
  - add at creation, based on limits
    - use arrow helpers from three?
  - show/hide and scale at update
- [ ] visualize other forces

  - idem
  - GetTotalLambdaRotation

- [ ] use anchors

- [ ] customize

  - [ ] mass
  - [ ] material

- [ ] symmetry

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
