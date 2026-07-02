window.Bloxyard = window.Bloxyard || {};
window.Bloxyard.Games = window.Bloxyard.Games || {};

function createLavaRushLevel(scene){
  const RISE_SPEED = 0.5;
  const LAVA_START = -1.6;
  const DEATH_BUFFER = 0.4;
  const STEPS = 16;

  scene.background = new THREE.Color(0x2a1a14);
  scene.fog = new THREE.Fog(0x2a1a14, 22, 60);

  scene.add(new THREE.AmbientLight(0xffb37a, 0.55));
  scene.add(new THREE.HemisphereLight(0xffcc99, 0x1a0f08, 0.5));
  const sun = new THREE.DirectionalLight(0xffddaa, 0.8);
  sun.position.set(15, 30, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  sun.shadow.camera.left = -18; sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 26; sun.shadow.camera.bottom = -6;
  sun.shadow.camera.near = 1; sun.shadow.camera.far = 60;
  sun.shadow.bias = -0.0025;
  scene.add(sun);

  // Spiral staircase of platforms climbing away from the rising lava.
  const platMat = new THREE.MeshPhongMaterial({ color:0x8a6a4a, shininess:15 });
  const topMat = new THREE.MeshPhongMaterial({ color:0x3ca03c, shininess:15 });
  const seq = [];
  for (let i=0; i<STEPS; i++){
    const angle = i * 0.82;
    const radius = 6.2;
    const isTop = i === STEPS-1;
    seq.push({
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      y: i * 1.05,
      w: isTop ? 5 : Math.max(1.8, 2.8 - i*0.05),
      h: 0.6,
      d: isTop ? 5 : Math.max(1.8, 2.8 - i*0.05),
      isTop,
    });
  }
  // Start platform is wide and centered so the player doesn't spawn over a gap.
  seq[0].x = 0; seq[0].z = 0; seq[0].w = 4; seq[0].d = 4;

  const platforms = [];
  seq.forEach(p=>{
    const m = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, p.d), p.isTop ? topMat : platMat);
    m.position.set(p.x, p.y, p.z);
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
    platforms.push({ ...p, top: p.y + p.h/2 });
  });

  const topPlatform = platforms[platforms.length-1];
  const LAVA_MAX = topPlatform.top - 1.4;

  function makeLavaTexture(){
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    g.fillStyle = '#ff5a1e';
    g.fillRect(0, 0, size, size);
    for (let i=0;i<40;i++){
      g.fillStyle = i % 2 === 0 ? '#ffb347' : '#c22c0a';
      const x = Math.random()*size, y = Math.random()*size, r = 8 + Math.random()*22;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI*2); g.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    return tex;
  }
  const lava = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.MeshBasicMaterial({ map: makeLavaTexture() })
  );
  lava.rotation.x = -Math.PI/2;
  lava.position.y = LAVA_START;
  scene.add(lava);

  const glow = new THREE.PointLight(0xff5a1e, 1.2, 30);
  glow.position.set(0, LAVA_START + 1, 0);
  scene.add(glow);

  function groundHeightAt(x, z){
    let h = -999;
    let found = false;
    platforms.forEach(p=>{
      if (x > p.x-p.w/2 && x < p.x+p.w/2 && z > p.z-p.d/2 && z < p.z+p.d/2){
        if (p.top > h){ h = p.top; found = true; }
      }
    });
    return found ? h : -999;
  }

  let lavaHeight = LAVA_START;
  let ended = false;

  return {
    name: 'Lava Rush',
    spawn: { x: platforms[0].x, y: platforms[0].top, z: platforms[0].z },
    bounds: { minX:-11, maxX:11, minZ:-11, maxZ:11 },
    groundHeightAt,
    update(dt, playerGroup, callbacks){
      if (ended) return;

      lavaHeight = Math.min(LAVA_MAX, lavaHeight + RISE_SPEED*dt);
      lava.position.y = lavaHeight;
      glow.position.y = lavaHeight + 1;

      if (playerGroup.position.y < lavaHeight + DEATH_BUFFER){
        ended = true;
        callbacks.onGameOver && callbacks.onGameOver('You fell into the lava! Game over.');
        return;
      }

      const dx = playerGroup.position.x - topPlatform.x;
      const dz = playerGroup.position.z - topPlatform.z;
      if (Math.abs(dx) < topPlatform.w/2 && Math.abs(dz) < topPlatform.d/2 &&
          Math.abs(playerGroup.position.y - topPlatform.top) < 1.5){
        ended = true;
        callbacks.onWin && callbacks.onWin('You escaped the lava! Safe at the top.', 'Fireproof Badge');
      }
    },
  };
}

window.Bloxyard.Games.lavarush = createLavaRushLevel;
