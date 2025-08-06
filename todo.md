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

- [x] use anchors

- [x] visualize motor force

  - add at creation, based on limits
    - use arrow helpers from three?
  - show/hide and scale at update

- [x] fix joint control forces
- [x] customize material

- [x] fix joint limit viz

- [x] visualize rotation lambda

  - idem
  - GetTotalLambdaRotation

- [x] symmetry

- [x] fix centering force to be relative to the axis center
- [x] contacts
  - body velocity after collision detection is unreliable. Save all body linear and angular velocities outside of Jolt, and use them
    - save in array of userData. Save idx by body.SetUserData(idx)
    - part and isJoint are optional
- [ ] tidy up the types
- [ ] move data extraction from Jolt to "world", so the others only have to consume them

- [ ] max torque setting

  - root multiplier
  - base
  - base from to end
  - base from others
  - base multiplier = 1

- [ ] scaled rotation in viz object

- [ ] skeleton lines

  - t axis line
  - even/odd colors

- [ ] swing limit reduction from roll
