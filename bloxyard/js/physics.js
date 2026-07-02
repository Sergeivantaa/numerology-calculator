window.Bloxyard = window.Bloxyard || {};

const GRAVITY = -24;
const JUMP_FORCE = 9.5;
const WALK_SPEED = 5.2;
const RUN_SPEED = 9.5;

function createMotionState(){
  return { velocityY: 0, grounded: true, wasFalling: false, walkCycle: 0, footstepTimer: 0 };
}

function stepMotion(dt, opts){
  const { keys, invOpen, playerGroup, state, cameraYaw, groundHeightAt, bounds, onJump, onLand } = opts;

  let inputForward = 0, inputRight = 0;
  if (keys.KeyW) inputForward += 1;
  if (keys.KeyS) inputForward -= 1;
  if (keys.KeyD) inputRight += 1;
  if (keys.KeyA) inputRight -= 1;

  const moving = (inputForward !== 0 || inputRight !== 0) && !invOpen;
  const running = !!(keys.ShiftLeft || keys.ShiftRight);
  const speed = running ? RUN_SPEED : WALK_SPEED;

  if (moving){
    const len = Math.hypot(inputForward, inputRight);
    const nf = inputForward/len, nr = inputRight/len;
    const fx = Math.sin(cameraYaw), fz = Math.cos(cameraYaw);
    const rx = Math.cos(cameraYaw), rz = -Math.sin(cameraYaw);
    const worldX = fx*nf + rx*nr;
    const worldZ = fz*nf + rz*nr;
    playerGroup.position.x += worldX * speed * dt;
    playerGroup.position.z += worldZ * speed * dt;

    const targetAngle = Math.atan2(worldX, worldZ);
    let da = targetAngle - playerGroup.rotation.y;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    playerGroup.rotation.y += da * Math.min(1, dt*12);
  }

  if (bounds){
    playerGroup.position.x = Math.max(bounds.minX, Math.min(bounds.maxX, playerGroup.position.x));
    playerGroup.position.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, playerGroup.position.z));
  }

  const floorY = groundHeightAt(playerGroup.position.x, playerGroup.position.z);

  if (keys.Space && state.grounded && !invOpen){
    state.velocityY = JUMP_FORCE;
    state.grounded = false;
    onJump && onJump();
  }
  state.velocityY += GRAVITY * dt;
  playerGroup.position.y += state.velocityY * dt;

  if (playerGroup.position.y <= floorY){
    playerGroup.position.y = floorY;
    if (!state.grounded && state.wasFalling) onLand && onLand();
    state.velocityY = 0;
    state.grounded = true;
    state.wasFalling = false;
  } else {
    state.grounded = false;
    if (state.velocityY < -1) state.wasFalling = true;
  }

  return { moving, running, grounded: state.grounded };
}

function stepWalkAnim(dt, character, state, moving, running, grounded){
  const maxSwing = running ? 0.9 : 0.65;
  let footstep = false;
  if (moving && grounded){
    state.walkCycle += dt * (running ? 11 : 8);
    const s = Math.sin(state.walkCycle) * maxSwing;
    character.leftLeg.rotation.x = s;
    character.rightLeg.rotation.x = -s;
    character.leftArm.rotation.x = -s;
    character.rightArm.rotation.x = s;

    state.footstepTimer += dt;
    const interval = running ? 0.22 : 0.34;
    if (state.footstepTimer > interval){
      state.footstepTimer = 0;
      footstep = true;
    }
  } else if (!grounded){
    character.leftLeg.rotation.x = 0.35;
    character.rightLeg.rotation.x = 0.35;
    character.leftArm.rotation.x = -0.6;
    character.rightArm.rotation.x = -0.6;
  } else {
    character.leftLeg.rotation.x *= 0.8;
    character.rightLeg.rotation.x *= 0.8;
    character.leftArm.rotation.x *= 0.8;
    character.rightArm.rotation.x *= 0.8;
    state.walkCycle = 0;
    state.footstepTimer = 0;
  }
  return footstep;
}

window.Bloxyard.Physics = { GRAVITY, JUMP_FORCE, WALK_SPEED, RUN_SPEED, createMotionState, stepMotion, stepWalkAnim };
