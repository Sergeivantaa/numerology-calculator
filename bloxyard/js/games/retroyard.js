window.Bloxyard = window.Bloxyard || {};
window.Bloxyard.Games = window.Bloxyard.Games || {};

function createRetroYardLevel(scene){
  scene.background = new THREE.Color(0x6fb7e0);
  scene.fog = new THREE.Fog(0x6fb7e0, 25, 70);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x4a3d1f, 0.65));
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(20, 30, 10);
  scene.add(sun);

  function makeCheckerTexture(){
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const cell = size/8;
    for (let y=0;y<8;y++){
      for (let x=0;x<8;x++){
        g.fillStyle = (x+y)%2===0 ? '#5fae4a' : '#4f9a3e';
        g.fillRect(x*cell, y*cell, cell, cell);
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(20,20);
    tex.magFilter = THREE.NearestFilter;
    return tex;
  }
  const groundMat = new THREE.MeshLambertMaterial({ map: makeCheckerTexture() });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120,120), groundMat);
  ground.rotation.x = -Math.PI/2;
  scene.add(ground);

  const wallMat = new THREE.MeshLambertMaterial({ color:0x8a5a3c, flatShading:true });
  const arenaSize = 45;
  [[0,-arenaSize],[0,arenaSize],[-arenaSize,0],[arenaSize,0]].forEach(([x,z], i)=>{
    const horiz = (i<2);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(horiz?arenaSize*2:2, 4, horiz?2:arenaSize*2), wallMat);
    wall.position.set(x, 2, z);
    scene.add(wall);
  });

  const platMat = new THREE.MeshLambertMaterial({ color:0xd9a441, flatShading:true });
  const platforms = [
    {x:8,y:1.5,z:5,w:5,h:1,d:5},
    {x:14,y:3,z:2,w:4,h:1,d:4},
    {x:-10,y:1,z:-8,w:6,h:1,d:6},
    {x:-16,y:2.5,z:-8,w:4,h:1,d:4},
  ];
  platforms.forEach(p=>{
    const m = new THREE.Mesh(new THREE.BoxGeometry(p.w,p.h,p.d), platMat);
    m.position.set(p.x, p.y, p.z);
    scene.add(m);
  });

  function groundHeightAt(x,z){
    let h = 0;
    platforms.forEach(p=>{
      if (x > p.x-p.w/2 && x < p.x+p.w/2 && z > p.z-p.d/2 && z < p.z+p.d/2){
        h = Math.max(h, p.y + p.h/2);
      }
    });
    return h;
  }

  const pickups = [];
  function spawnPickup(name, color, geom, x, z, y, scaleY){
    const mat = new THREE.MeshLambertMaterial({ color, flatShading:true });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y!==undefined?y:0.6, z);
    if (scaleY) mesh.scale.y = scaleY;
    scene.add(mesh);
    pickups.push({ name, mesh, alive:true });
  }
  const coinGeom = new THREE.SphereGeometry(0.35, 8, 8);
  const gemGeom = new THREE.OctahedronGeometry(0.4);
  const keyGeom = new THREE.BoxGeometry(0.6, 0.15, 0.3);

  spawnPickup('Gold Coin', 0xffd23c, coinGeom, 5, 0);
  spawnPickup('Gold Coin', 0xffd23c, coinGeom, -6, 4);
  spawnPickup('Gold Coin', 0xffd23c, coinGeom, 2, -10);
  spawnPickup('Retro Gem', 0x9b4fdb, gemGeom, 8, 5, 2.3, 1.5);
  spawnPickup('Retro Gem', 0x9b4fdb, gemGeom, -10, -8, 1.85, 1.5);
  spawnPickup('Retro Gem', 0x9b4fdb, gemGeom, 14, 2, 3.85, 1.5);
  spawnPickup('Old Key', 0xc0c0c0, keyGeom, -16, -8, 3.1);
  spawnPickup('Old Key', 0xc0c0c0, keyGeom, 0, 15);
  spawnPickup('Old Key', 0xc0c0c0, keyGeom, -20, 10);

  return {
    name: 'Retro Yard',
    spawn: { x:0, y:0, z:8 },
    bounds: { minX:-(arenaSize-2), maxX:arenaSize-2, minZ:-(arenaSize-2), maxZ:arenaSize-2 },
    groundHeightAt,
    update(dt, playerGroup, callbacks){
      pickups.forEach(p=>{
        if (!p.alive) return;
        const dx = p.mesh.position.x - playerGroup.position.x;
        const dz = p.mesh.position.z - playerGroup.position.z;
        const dy = p.mesh.position.y - (playerGroup.position.y + 1);
        if (Math.hypot(dx,dz,dy) < 1.3){
          p.alive = false;
          p.mesh.visible = false;
          callbacks.onCollect && callbacks.onCollect(p.name);
        } else {
          p.mesh.rotation.y += dt*1.5;
        }
      });
    }
  };
}

window.Bloxyard.Games.retroyard = createRetroYardLevel;
