window.Bloxyard = window.Bloxyard || {};

function createEngine(container){
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 200);
  const renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  window.addEventListener('resize', ()=>{
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const canvas = renderer.domElement;
  canvas.addEventListener('contextmenu', e=>e.preventDefault());

  const keys = {};
  window.addEventListener('keydown', e=>{ keys[e.code] = true; });
  window.addEventListener('keyup', e=>{ keys[e.code] = false; });

  const camState = { yaw:0, pitch:0.35, dist:8 };
  const zoomSteps = [4,6,8,10,14];
  let zoomIndex = 2;

  let rmbDown = false, lastX = 0, lastY = 0;
  canvas.addEventListener('mousedown', e=>{
    if (e.button === 2){ rmbDown = true; lastX = e.clientX; lastY = e.clientY; }
  });
  window.addEventListener('mouseup', e=>{ if (e.button === 2) rmbDown = false; });
  window.addEventListener('mousemove', e=>{
    if (!rmbDown) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    camState.yaw -= dx * 0.0045;
    camState.pitch -= dy * 0.0030;
    camState.pitch = Math.max(0.08, Math.min(1.2, camState.pitch));
  });
  canvas.addEventListener('wheel', e=>{
    if (e.deltaY > 0) zoomIndex = Math.min(zoomSteps.length-1, zoomIndex+1);
    else zoomIndex = Math.max(0, zoomIndex-1);
    camState.dist = zoomSteps[zoomIndex];
  });

  const clock = new THREE.Clock();
  let updateFn = null;
  let active = false;

  // Smoothly eases toward the ideal follow position/lookAt instead of
  // snapping every frame, matching Roblox's soft trailing camera feel.
  let smoothPos = null;
  let smoothLook = null;

  function followCamera(target, dt){
    const idealX = target.x - Math.sin(camState.yaw)*Math.cos(camState.pitch)*camState.dist;
    const idealZ = target.z - Math.cos(camState.yaw)*Math.cos(camState.pitch)*camState.dist;
    const idealY = target.y + 1.6 + Math.sin(camState.pitch)*camState.dist;
    const lookX = target.x, lookY = target.y + 1.6, lookZ = target.z;

    if (!smoothPos){
      smoothPos = { x:idealX, y:idealY, z:idealZ };
      smoothLook = { x:lookX, y:lookY, z:lookZ };
    } else {
      const t = dt ? 1 - Math.pow(0.0001, dt) : 1;
      smoothPos.x += (idealX - smoothPos.x) * t;
      smoothPos.y += (idealY - smoothPos.y) * t;
      smoothPos.z += (idealZ - smoothPos.z) * t;
      smoothLook.x += (lookX - smoothLook.x) * t;
      smoothLook.y += (lookY - smoothLook.y) * t;
      smoothLook.z += (lookZ - smoothLook.z) * t;
    }

    camera.position.set(smoothPos.x, smoothPos.y, smoothPos.z);
    camera.lookAt(smoothLook.x, smoothLook.y, smoothLook.z);
  }

  function resetCamera(){
    camState.yaw = 0;
    camState.pitch = 0.35;
    zoomIndex = 2;
    camState.dist = zoomSteps[zoomIndex];
    smoothPos = null;
    smoothLook = null;
  }

  function clearScene(){
    for (let i = scene.children.length - 1; i >= 0; i--) scene.remove(scene.children[i]);
    for (const k in keys) keys[k] = false;
  }

  function setUpdate(fn){ updateFn = fn; }
  function setActive(v){
    active = v;
    if (active) clock.getDelta(); // drop the idle-time delta so we don't jump on resume
  }

  function loop(){
    requestAnimationFrame(loop);
    if (!active) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    if (updateFn) updateFn(dt);
    renderer.render(scene, camera);
  }
  loop();

  return { scene, camera, renderer, keys, camState, followCamera, resetCamera, clearScene, setUpdate, setActive };
}

window.Bloxyard.Engine = { createEngine };
