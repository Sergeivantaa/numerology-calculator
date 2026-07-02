window.Bloxyard = window.Bloxyard || {};

(function(){
  const GRID_EXTENT = 40; // world spans roughly -20..20 on x/z
  const PAN_SPEED = 9;
  const BLOCK_COLORS = [0xd9a441, 0x8a5a3c, 0x5fae4a, 0x5c8fd6, 0xdb3c3c, 0xffd23c, 0x9b4fdb, 0x555555, 0xffffff];

  let objectsGroup = null;
  let ground = null;
  let placed = []; // { type, x, z, color, mesh }
  let panTarget = { x:0, y:0, z:0 };
  let selectedTool = 'block';
  let selectedColor = BLOCK_COLORS[0];
  const raycaster = new THREE.Raycaster();
  let wired = false;

  function toCss(hex){ return '#' + hex.toString(16).padStart(6,'0'); }

  function makeMesh(type, color){
    if (type === 'rock'){
      const mesh = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.5, 0),
        new THREE.MeshLambertMaterial({ color:0x8f8f8f, flatShading:true })
      );
      mesh.position.y = 0.35;
      mesh.rotation.set(0.3, 0.6, 0);
      mesh.castShadow = true; mesh.receiveShadow = true;
      return mesh;
    }
    if (type === 'tree'){
      const group = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.24, 1.4, 6),
        new THREE.MeshLambertMaterial({ color:0x7a5230, flatShading:true })
      );
      trunk.position.y = 0.7; trunk.castShadow = true; trunk.receiveShadow = true;
      const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(1.1, 2.0, 7),
        new THREE.MeshLambertMaterial({ color:0x2f8f3a, flatShading:true })
      );
      leaves.position.y = 2.1; leaves.castShadow = true; leaves.receiveShadow = true;
      group.add(trunk, leaves);
      return group;
    }
    // block
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshPhongMaterial({ color, shininess:35 })
    );
    mesh.position.y = 0.5;
    mesh.castShadow = true; mesh.receiveShadow = true;
    return mesh;
  }

  function spawnMesh(type, x, z, color){
    const mesh = makeMesh(type, color);
    mesh.position.x = x;
    mesh.position.z = z;
    objectsGroup.add(mesh);
    placed.push({ type, x, z, color, mesh });
  }

  function save(){
    window.Bloxyard.Storage.saveBuild(placed.map(p => ({ type:p.type, x:p.x, z:p.z, color:p.color })));
  }

  function removeObject(hitObject){
    let top = hitObject;
    while (top.parent && top.parent !== objectsGroup) top = top.parent;
    const idx = placed.findIndex(p => p.mesh === top);
    if (idx >= 0){
      objectsGroup.remove(top);
      placed.splice(idx, 1);
      save();
    }
  }

  function buildScene(engine){
    engine.scene.background = new THREE.Color(0x8fd0f0);
    engine.scene.fog = new THREE.Fog(0x8fd0f0, 35, 95);

    engine.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    engine.scene.add(new THREE.HemisphereLight(0xffffff, 0x4a3d1f, 0.65));
    const sun = new THREE.DirectionalLight(0xffffff, 0.85);
    sun.position.set(20, 30, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1536, 1536);
    sun.shadow.camera.left = -24; sun.shadow.camera.right = 24;
    sun.shadow.camera.top = 24; sun.shadow.camera.bottom = -24;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 70;
    sun.shadow.bias = -0.0025;
    engine.scene.add(sun);

    // A checkered texture (one cell per placeable grid square) reads much
    // more clearly in perspective than a flat plane + thin grid lines.
    function makeGridTexture(){
      const size = 512;
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const g = c.getContext('2d');
      const cell = size/8;
      for (let y=0;y<8;y++){
        for (let x=0;x<8;x++){
          g.fillStyle = (x+y)%2===0 ? '#8fd67f' : '#7fc76b';
          g.fillRect(x*cell, y*cell, cell, cell);
        }
      }
      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      // 8 cells per texture repeat, so each repeat covering GRID_EXTENT/8
      // world units puts exactly one checker cell per placement grid cell.
      tex.repeat.set(GRID_EXTENT/8, GRID_EXTENT/8);
      tex.magFilter = THREE.NearestFilter;
      return tex;
    }
    ground = new THREE.Mesh(
      new THREE.PlaneGeometry(GRID_EXTENT, GRID_EXTENT),
      new THREE.MeshLambertMaterial({ map: makeGridTexture() })
    );
    ground.rotation.x = -Math.PI/2;
    ground.receiveShadow = true;
    engine.scene.add(ground);

    objectsGroup = new THREE.Group();
    engine.scene.add(objectsGroup);
  }

  function loadSavedBuild(){
    const saved = window.Bloxyard.Storage.loadBuild();
    saved.forEach(p => spawnMesh(p.type, p.x, p.z, p.color));
  }

  function wireUI(){
    if (wired) return;
    wired = true;

    const toolButtons = document.querySelectorAll('#createPalette .paletteItem[data-item]');
    toolButtons.forEach(btn=>{
      btn.addEventListener('click', ()=>{
        selectedTool = btn.getAttribute('data-item');
        toolButtons.forEach(b => b.classList.toggle('selected', b === btn));
        document.getElementById('blockColorRow').style.display = selectedTool === 'block' ? 'flex' : 'none';
      });
    });

    const colorRow = document.getElementById('blockColorRow');
    BLOCK_COLORS.forEach(hex=>{
      const sw = document.createElement('div');
      sw.className = 'swatch' + (hex === selectedColor ? ' selected' : '');
      sw.style.background = toCss(hex);
      sw.addEventListener('click', ()=>{
        selectedColor = hex;
        colorRow.querySelectorAll('.swatch').forEach(s => s.classList.remove('selected'));
        sw.classList.add('selected');
      });
      colorRow.appendChild(sw);
    });

    document.getElementById('clearBuildBtn').addEventListener('click', ()=>{
      placed.forEach(p => objectsGroup.remove(p.mesh));
      placed = [];
      save();
    });
  }

  function enter(engine){
    engine.clearScene();
    engine.resetCamera();
    placed = [];
    panTarget = { x:0, y:0, z:0 };
    buildScene(engine);
    loadSavedBuild();
    wireUI();
    document.querySelectorAll('#createPalette .paletteItem[data-item]').forEach(b=>{
      b.classList.toggle('selected', b.getAttribute('data-item') === selectedTool);
    });
    document.getElementById('blockColorRow').style.display = selectedTool === 'block' ? 'flex' : 'none';
  }

  function update(engine, dt){
    let dx = 0, dz = 0;
    if (engine.keys.KeyW) dz -= 1;
    if (engine.keys.KeyS) dz += 1;
    if (engine.keys.KeyA) dx -= 1;
    if (engine.keys.KeyD) dx += 1;
    if (dx || dz){
      const len = Math.hypot(dx, dz);
      const nx = dx/len, nz = dz/len;
      const yaw = engine.camState.yaw;
      const worldX = Math.cos(yaw)*nx - Math.sin(yaw)*nz;
      const worldZ = -Math.sin(yaw)*nx - Math.cos(yaw)*nz;
      panTarget.x += worldX * PAN_SPEED * dt;
      panTarget.z += worldZ * PAN_SPEED * dt;
      const lim = GRID_EXTENT/2 - 1;
      panTarget.x = Math.max(-lim, Math.min(lim, panTarget.x));
      panTarget.z = Math.max(-lim, Math.min(lim, panTarget.z));
    }
    engine.followCamera(panTarget, dt);
  }

  function handleClick(engine, clientX, clientY){
    const rect = engine.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(mouse, engine.camera);

    const objHits = raycaster.intersectObjects(objectsGroup.children, true);
    if (objHits.length){
      removeObject(objHits[0].object);
      return;
    }
    const groundHits = raycaster.intersectObject(ground);
    if (groundHits.length){
      const p = groundHits[0].point;
      const lim = GRID_EXTENT/2 - 1;
      const gx = Math.max(-lim, Math.min(lim, Math.round(p.x)));
      const gz = Math.max(-lim, Math.min(lim, Math.round(p.z)));
      const occupied = placed.some(o => o.x === gx && o.z === gz && o.type === selectedTool);
      if (!occupied){
        spawnMesh(selectedTool, gx, gz, selectedColor);
        save();
      }
    }
  }

  window.Bloxyard.Editor = { enter, update, handleClick };
})();
