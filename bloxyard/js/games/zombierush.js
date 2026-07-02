window.Bloxyard = window.Bloxyard || {};
window.Bloxyard.Games = window.Bloxyard.Games || {};

function createZombieRushLevel(scene){
  const ARENA = 32;
  const MAX_HP = 100;
  const MAX_WAVE = 5;
  const PUNCH_RANGE = 2.2;
  const PUNCH_CONE_COS = Math.cos(Math.PI/3); // ~120 degree frontal cone
  const ZOMBIE_SPEED_BASE = 3.0;
  const CONTACT_RADIUS = 1.0;
  const CONTACT_DPS = 14;
  const WAVE_TRANSITION_S = 2.6;
  const ZOMBIE_SKIN_COLORS = [0x6a8f4f, 0x557a45, 0x7a8f5a];

  scene.background = new THREE.Color(0x393c30);
  scene.fog = new THREE.Fog(0x393c30, 16, 50);

  scene.add(new THREE.AmbientLight(0xaab4c8, 0.5));
  scene.add(new THREE.HemisphereLight(0x8899aa, 0x332a1e, 0.45));
  const moon = new THREE.DirectionalLight(0xccd6ff, 0.65);
  moon.position.set(-15, 25, -10);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1536, 1536);
  moon.shadow.camera.left = -20; moon.shadow.camera.right = 20;
  moon.shadow.camera.top = 20; moon.shadow.camera.bottom = -20;
  moon.shadow.camera.near = 1; moon.shadow.camera.far = 60;
  moon.shadow.bias = -0.0025;
  scene.add(moon);

  function makeGroundTexture(){
    const size = 512;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const cell = size/8;
    for (let y=0;y<8;y++){
      for (let x=0;x<8;x++){
        g.fillStyle = (x+y)%2===0 ? '#4a4a3c' : '#40402f';
        g.fillRect(x*cell, y*cell, cell, cell);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(16, 16);
    tex.magFilter = THREE.NearestFilter;
    return tex;
  }
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(ARENA*2, ARENA*2),
    new THREE.MeshLambertMaterial({ map: makeGroundTexture() })
  );
  ground.rotation.x = -Math.PI/2;
  ground.receiveShadow = true;
  scene.add(ground);

  const wallMat = new THREE.MeshLambertMaterial({ color:0x555046, flatShading:true });
  [[0,-ARENA],[0,ARENA],[-ARENA,0],[ARENA,0]].forEach(([x,z], i)=>{
    const horiz = (i<2);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(horiz?ARENA*2:2, 4, horiz?2:ARENA*2), wallMat);
    wall.position.set(x, 2, z);
    wall.castShadow = true; wall.receiveShadow = true;
    scene.add(wall);
  });

  const { buildCharacter } = window.Bloxyard.AvatarBuilder;
  const zombiesGroup = new THREE.Group();
  scene.add(zombiesGroup);

  let zombies = []; // { char, speed, alive, walkCycle }
  let wave = 0;
  let hp = MAX_HP;
  let spawnQueue = 0;
  let spawnTimer = 0;
  let waveClearedPending = false;
  let waveTransitionTimer = 0;
  let ended = false;

  function spawnZombie(){
    const angle = Math.random() * Math.PI * 2;
    const radius = 14 + Math.random() * 8; // close enough to reach the player at a reasonable pace
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    const skin = ZOMBIE_SKIN_COLORS[Math.floor(Math.random()*ZOMBIE_SKIN_COLORS.length)];
    const char = buildCharacter(
      { head: skin, torso: 0x2e2e26, pants: 0x232319 },
      { hat:false, hatColor:0x000000 },
      'zombie'
    );
    char.group.position.set(x, 0, z);
    zombiesGroup.add(char.group);
    zombies.push({
      char,
      speed: ZOMBIE_SPEED_BASE + wave*0.15 + Math.random()*0.4,
      alive: true,
      walkCycle: Math.random()*10,
    });
  }

  function startWave(callbacks){
    wave++;
    spawnQueue = 3 + wave*2;
    spawnTimer = 0;
    callbacks.onWaveStart && callbacks.onWaveStart(wave, MAX_WAVE);
  }

  return {
    name: 'Zombie Rush',
    spawn: { x:0, y:0, z:0 },
    bounds: { minX:-(ARENA-2), maxX:ARENA-2, minZ:-(ARENA-2), maxZ:ARENA-2 },
    maxHp: MAX_HP,
    groundHeightAt(){ return 0; },

    update(dt, playerGroup, callbacks){
      if (ended) return;

      if (wave === 0) startWave(callbacks);

      if (spawnQueue > 0){
        spawnTimer -= dt;
        if (spawnTimer <= 0){
          spawnZombie();
          spawnQueue--;
          spawnTimer = 0.55;
        }
      }

      zombies.forEach(z=>{
        if (!z.alive) return;
        const dx = playerGroup.position.x - z.char.group.position.x;
        const dz = playerGroup.position.z - z.char.group.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.001){
          const nx = dx/dist, nz = dz/dist;
          // Stop just outside melee range instead of walking through the
          // player — otherwise the zombie mesh clips the camera.
          if (dist > 0.85){
            z.char.group.position.x += nx * z.speed * dt;
            z.char.group.position.z += nz * z.speed * dt;
          }
          z.char.group.rotation.y = Math.atan2(nx, nz);
        }
        z.walkCycle += dt * 7;
        const s = Math.sin(z.walkCycle) * 0.5;
        z.char.leftLeg.rotation.x = s;
        z.char.rightLeg.rotation.x = -s;
        z.char.leftArm.rotation.x = -s*0.6 - 0.3;
        z.char.rightArm.rotation.x = s*0.6 - 0.3;

        if (dist < CONTACT_RADIUS && !ended){
          hp = Math.max(0, hp - CONTACT_DPS*dt);
          callbacks.onDamage && callbacks.onDamage(hp, MAX_HP);
          if (hp <= 0){
            ended = true;
            callbacks.onGameOver && callbacks.onGameOver();
          }
        }
      });

      if (!ended && !waveClearedPending && spawnQueue === 0 && zombies.length > 0 && zombies.every(z => !z.alive)){
        waveClearedPending = true;
        waveTransitionTimer = WAVE_TRANSITION_S;
      }
      if (waveClearedPending){
        waveTransitionTimer -= dt;
        if (waveTransitionTimer <= 0){
          waveClearedPending = false;
          zombies = [];
          if (wave >= MAX_WAVE){
            ended = true;
            callbacks.onWin && callbacks.onWin();
          } else {
            startWave(callbacks);
          }
        }
      }
    },

    onAttack(playerGroup, callbacks){
      if (ended) return;
      const forward = { x: Math.sin(playerGroup.rotation.y), z: Math.cos(playerGroup.rotation.y) };
      zombies.forEach(z=>{
        if (!z.alive) return;
        const dx = z.char.group.position.x - playerGroup.position.x;
        const dz = z.char.group.position.z - playerGroup.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > PUNCH_RANGE) return;
        const nx = dist > 0.001 ? dx/dist : 0, nz = dist > 0.001 ? dz/dist : 1;
        const dot = nx*forward.x + nz*forward.z;
        if (dot > PUNCH_CONE_COS){
          z.alive = false;
          zombiesGroup.remove(z.char.group);
          callbacks.onKillZombie && callbacks.onKillZombie();
        }
      });
    },
  };
}

window.Bloxyard.Games.zombierush = createZombieRushLevel;
