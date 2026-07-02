window.Bloxyard = window.Bloxyard || {};

function createAvatarPreview(container){
  const { buildCharacter } = window.Bloxyard.AvatarBuilder;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xcfd8e3);
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(4, 8, 6);
  scene.add(sun);

  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 0.2, 24),
    new THREE.MeshLambertMaterial({ color:0xb9c4d6 })
  );
  pad.position.y = -0.1;
  scene.add(pad);

  let width = container.clientWidth || 360;
  let height = container.clientHeight || 360;
  const camera = new THREE.PerspectiveCamera(45, width/height, 0.1, 50);
  // Framed to fit head-to-foot including the tallest accessory (hat), not just the torso.
  camera.position.set(0, 1.85, 5.2);
  camera.lookAt(0, 1.55, 0);

  const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  let character = buildCharacter();
  scene.add(character.group);

  function setCharacter(colors, accessories){
    scene.remove(character.group);
    character = buildCharacter(colors, accessories);
    scene.add(character.group);
  }

  function resize(){
    width = container.clientWidth || width;
    height = container.clientHeight || height;
    camera.aspect = width/height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  window.addEventListener('resize', resize);

  let active = false;
  function setActive(v){ active = v; if (v) resize(); }

  function loop(){
    requestAnimationFrame(loop);
    if (!active) return;
    character.group.rotation.y += 0.012;
    renderer.render(scene, camera);
  }
  loop();

  return { setCharacter, setActive, resize };
}

window.Bloxyard.AvatarPreview = { createAvatarPreview };
