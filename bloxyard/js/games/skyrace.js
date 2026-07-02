window.Bloxyard = window.Bloxyard || {};
window.Bloxyard.Games = window.Bloxyard.Games || {};

function createSkyRaceLevel(scene){
  scene.background = new THREE.Color(0x1a1a3a);
  scene.fog = new THREE.Fog(0x1a1a3a, 20, 90);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2a4a, 0.7));
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(15, 25, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 40;
  sun.shadow.camera.bottom = -30;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 100;
  sun.shadow.bias = -0.0025;
  scene.add(sun);

  // ---- night sky detail: stars + moon ----
  const starCount = 320;
  const starPos = new Float32Array(starCount * 3);
  for (let i=0;i<starCount;i++){
    starPos[i*3]   = Math.random()*160 - 30;
    starPos[i*3+1] = 14 + Math.random()*40;
    starPos[i*3+2] = (Math.random()-0.5)*110;
  }
  const starGeom = new THREE.BufferGeometry();
  starGeom.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeom, new THREE.PointsMaterial({ color:0xffffff, size:1.4, sizeAttenuation:false }));
  scene.add(stars);

  const moon = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 16), new THREE.MeshBasicMaterial({ color:0xf5f0d8 }));
  moon.position.set(-10, 32, -40);
  scene.add(moon);

  const platMat = new THREE.MeshLambertMaterial({ color:0x5c8fd6, flatShading:true });
  const checkMat = new THREE.MeshLambertMaterial({ color:0xffd23c, flatShading:true });
  const finishMat = new THREE.MeshLambertMaterial({ color:0x3ca03c, flatShading:true });

  // Deterministic layout (no randomness) so the course is always fair/repeatable.
  const seq = [ { x:0, y:0, z:0, w:4, h:1, d:4 } ];
  const stepPattern = [
    {dx:3.0, dy:0},   {dx:3.2, dy:0.6}, {dx:3.0, dy:0},   {dx:3.4, dy:-0.6, checkpoint:true},
    {dx:2.8, dy:0.6}, {dx:3.0, dy:0.6}, {dx:2.6, dy:0},   {dx:3.2, dy:-0.6, checkpoint:true},
    {dx:2.6, dy:0.6}, {dx:2.6, dy:0.6}, {dx:2.4, dy:0},   {dx:3.0, dy:-1.2, checkpoint:true},
  ];
  let x = 0, y = 0, z = 0;
  stepPattern.forEach((s, i)=>{
    x += s.dx; y += s.dy;
    const w = Math.max(1.6, 2.6 - i*0.06);
    seq.push({ x, y, z, w, h:1, d:2.2, checkpoint: !!s.checkpoint });
  });
  x += 3.5;
  seq.push({ x, y, z, w:6, h:1, d:6, finish:true });

  const platforms = [];
  seq.forEach(p=>{
    const mat = p.finish ? finishMat : (p.checkpoint ? checkMat : platMat);
    const m = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h, p.d), mat);
    m.position.set(p.x, p.y, p.z);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    platforms.push({ ...p, top: p.y + p.h/2 });
  });

  const finishPlat = platforms[platforms.length-1];
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.08,3,6), new THREE.MeshLambertMaterial({ color:0xcccccc }));
  pole.position.set(finishPlat.x, finishPlat.top+1.5, finishPlat.z);
  pole.castShadow = true;
  scene.add(pole);
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.8,0.5,0.05), new THREE.MeshLambertMaterial({ color:0xdb3c3c, flatShading:true }));
  flag.position.set(finishPlat.x+0.4, finishPlat.top+2.6, finishPlat.z);
  flag.castShadow = true;
  scene.add(flag);

  function computeFloor(px, pz){
    let h = -999;
    platforms.forEach(p=>{
      if (px > p.x-p.w/2 && px < p.x+p.w/2 && pz > p.z-p.d/2 && pz < p.z+p.d/2){
        if (p.top > h) h = p.top;
      }
    });
    return h;
  }

  let lastCheckpoint = { x: platforms[0].x, y: platforms[0].top, z: platforms[0].z };

  return {
    name: 'Sky Race',
    spawn: { x: platforms[0].x, y: platforms[0].top, z: platforms[0].z },
    bounds: null,
    groundHeightAt: computeFloor,
    update(dt, playerGroup, callbacks){
      if (playerGroup.position.y < lastCheckpoint.y - 8){
        playerGroup.position.set(lastCheckpoint.x, lastCheckpoint.y, lastCheckpoint.z);
        callbacks.onFall && callbacks.onFall();
      }
      platforms.forEach(p=>{
        if (!p.checkpoint && !p.finish) return;
        const dx = playerGroup.position.x - p.x, dz = playerGroup.position.z - p.z;
        if (Math.abs(dx) < p.w/2 && Math.abs(dz) < p.d/2 && Math.abs(playerGroup.position.y - p.top) < 1.5){
          if (p.finish){
            if (!p.reached){ p.reached = true; callbacks.onFinish && callbacks.onFinish(); }
          } else if (lastCheckpoint.x !== p.x){
            lastCheckpoint = { x:p.x, y:p.top, z:p.z };
            callbacks.onCheckpoint && callbacks.onCheckpoint();
          }
        }
      });
      flag.rotation.y += dt*2;
    }
  };
}

window.Bloxyard.Games.skyrace = createSkyRaceLevel;
