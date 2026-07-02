window.Bloxyard = window.Bloxyard || {};
window.Bloxyard.Games = window.Bloxyard.Games || {};

function createMazeLevel(scene){
  const W = 7, H = 7;
  const CELL = 3.6;
  const WALL_H = 1.9;
  const WALL_T = 0.3;
  const PLAYER_RADIUS = 0.32;
  const TIME_LIMIT = 90;

  scene.background = new THREE.Color(0x1c2333);
  scene.fog = new THREE.Fog(0x1c2333, 16, 45);

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  scene.add(new THREE.HemisphereLight(0xaab8ff, 0x1a1a2a, 0.5));
  const sun = new THREE.DirectionalLight(0xffffff, 0.6);
  sun.position.set(10, 25, 8);
  scene.add(sun);

  // ---- deterministic-per-playthrough perfect maze (DFS carve) ----
  const visited = Array.from({length:H}, ()=> Array(W).fill(false));
  const right = Array.from({length:H}, ()=> Array(W).fill(true));
  const down = Array.from({length:H}, ()=> Array(W).fill(true));

  function shuffle(arr){
    for (let i=arr.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
  function carve(cx, cy){
    visited[cy][cx] = true;
    shuffle([[1,0],[-1,0],[0,1],[0,-1]]).forEach(([dx,dy])=>{
      const nx = cx+dx, ny = cy+dy;
      if (nx<0||nx>=W||ny<0||ny>=H||visited[ny][nx]) return;
      if (dx===1) right[cy][cx] = false;
      if (dx===-1) right[cy][nx] = false;
      if (dy===1) down[cy][cx] = false;
      if (dy===-1) down[ny][cx] = false;
      carve(nx, ny);
    });
  }
  carve(0, 0);

  const offsetX = -(W-1)*CELL/2, offsetZ = -(H-1)*CELL/2;
  function cellPos(cx, cz){ return { x: offsetX + cx*CELL, z: offsetZ + cz*CELL }; }

  const floorMat = new THREE.MeshLambertMaterial({ color:0x3a4258 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry((W*CELL)*2.5, (H*CELL)*2.5), floorMat);
  floor.rotation.x = -Math.PI/2;
  floor.receiveShadow = true;
  scene.add(floor);

  const wallMat = new THREE.MeshLambertMaterial({ color:0x6a5acd, flatShading:true });
  const walls = []; // { minX, maxX, minZ, maxZ }
  function addWall(cx, cz, w, d){
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, WALL_H, d), wallMat);
    mesh.position.set(cx, WALL_H/2, cz);
    mesh.receiveShadow = true;
    scene.add(mesh);
    walls.push({ minX: cx-w/2, maxX: cx+w/2, minZ: cz-d/2, maxZ: cz+d/2 });
  }

  for (let y=0;y<H;y++){
    for (let x=0;x<W;x++){
      const p = cellPos(x, y);
      if (right[y][x]) addWall(p.x + CELL/2, p.z, WALL_T, CELL + WALL_T);
      if (down[y][x]) addWall(p.x, p.z + CELL/2, CELL + WALL_T, WALL_T);
    }
  }
  // perimeter
  addWall(offsetX - WALL_T/2, offsetZ + (H-1)*CELL/2, WALL_T, H*CELL + WALL_T);
  addWall(offsetX + (W-1)*CELL + WALL_T/2, offsetZ + (H-1)*CELL/2, WALL_T, H*CELL + WALL_T);
  addWall(offsetX + (W-1)*CELL/2, offsetZ - WALL_T/2, W*CELL + WALL_T, WALL_T);
  addWall(offsetX + (W-1)*CELL/2, offsetZ + (H-1)*CELL + WALL_T/2, W*CELL + WALL_T, WALL_T);

  const startPos = cellPos(0, 0);
  const exitPos = cellPos(W-1, H-1);

  const exitMarker = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6),
    new THREE.MeshBasicMaterial({ color:0x3ca03c })
  );
  exitMarker.position.set(exitPos.x, 1.3, exitPos.z);
  scene.add(exitMarker);
  const exitGlow = new THREE.PointLight(0x3ca03c, 1.2, 8);
  exitGlow.position.set(exitPos.x, 1.5, exitPos.z);
  scene.add(exitGlow);

  function resolveWalls(playerGroup){
    const p = playerGroup.position;
    walls.forEach(w=>{
      const closestX = Math.max(w.minX, Math.min(p.x, w.maxX));
      const closestZ = Math.max(w.minZ, Math.min(p.z, w.maxZ));
      const dx = p.x - closestX, dz = p.z - closestZ;
      const distSq = dx*dx + dz*dz;
      if (distSq < PLAYER_RADIUS*PLAYER_RADIUS){
        const dist = Math.sqrt(distSq) || 0.0001;
        const push = PLAYER_RADIUS - dist;
        p.x += (dx/dist) * push;
        p.z += (dz/dist) * push;
      }
    });
  }

  let timeLeft = TIME_LIMIT;
  let ended = false;
  let lastSecondShown = TIME_LIMIT;

  return {
    name: 'Maze Escape',
    spawn: { x: startPos.x, y: 0, z: startPos.z },
    bounds: null,
    groundHeightAt(){ return 0; },
    update(dt, playerGroup, callbacks){
      if (ended) return;
      resolveWalls(playerGroup);

      timeLeft = Math.max(0, timeLeft - dt);
      const shown = Math.ceil(timeLeft);
      if (shown !== lastSecondShown){
        lastSecondShown = shown;
        callbacks.onTimerUpdate && callbacks.onTimerUpdate(shown, TIME_LIMIT);
      }
      if (timeLeft <= 0){
        ended = true;
        callbacks.onGameOver && callbacks.onGameOver("Time's up! You never found the exit.");
        return;
      }

      const dx = playerGroup.position.x - exitPos.x;
      const dz = playerGroup.position.z - exitPos.z;
      if (Math.hypot(dx, dz) < 1.2){
        ended = true;
        callbacks.onWin && callbacks.onWin('You found the exit!', 'Maze Medal');
      }
    },
  };
}

window.Bloxyard.Games.maze = createMazeLevel;
