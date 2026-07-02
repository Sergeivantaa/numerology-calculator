window.Bloxyard = window.Bloxyard || {};

(function(){
  function buildRoboPet(){
    const group = new THREE.Group();
    const mat = new THREE.MeshPhongMaterial({ color:0x8fd6e8, shininess:80, specular:0x888888 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.32), mat);
    body.castShadow = true; body.receiveShadow = true;
    group.add(body);
    const eyeMat = new THREE.MeshBasicMaterial({ color:0x1a1a1a });
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), eyeMat);
    eye.position.set(0, 0.02, 0.17);
    group.add(eye);
    const antennaMat = new THREE.MeshPhongMaterial({ color:0x555555 });
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2, 6), antennaMat);
    antenna.position.set(0, 0.24, 0);
    group.add(antenna);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshBasicMaterial({ color:0xff5a5a }));
    tip.position.set(0, 0.35, 0);
    group.add(tip);
    return { group, hoverBase: 0.45, bobSpeed: 3.2, bobHeight: 0.08, legs: null };
  }

  function buildPuppyPet(){
    const group = new THREE.Group();
    const furMat = new THREE.MeshPhongMaterial({ color:0xd9a978, shininess:20 });
    const spotMat = new THREE.MeshPhongMaterial({ color:0xffffff, shininess:20 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.24, 0.24), furMat);
    body.position.y = 0.18;
    body.castShadow = true; body.receiveShadow = true;
    group.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), spotMat);
    head.position.set(0.26, 0.22, 0);
    head.castShadow = true;
    group.add(head);
    const ear1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.1, 0.08), furMat);
    ear1.position.set(0.3, 0.32, 0.08);
    const ear2 = ear1.clone(); ear2.position.z = -0.08;
    group.add(ear1, ear2);
    const legs = [];
    [[-0.12,0.1],[0.12,0.1],[-0.12,-0.1],[0.12,-0.1]].forEach(([lx,lz])=>{
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.16,0.06), furMat);
      leg.position.set(lx, 0.08, lz);
      leg.castShadow = true;
      group.add(leg);
      legs.push(leg);
    });
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.03,0.18,6), furMat);
    tail.position.set(-0.24, 0.24, 0);
    tail.rotation.z = Math.PI/3;
    group.add(tail);
    return { group, hoverBase: 0, bobSpeed: 6, bobHeight: 0.03, legs };
  }

  function buildPet(type){
    const built = type === 'robo' ? buildRoboPet() : buildPuppyPet();
    built.group.traverse(o=>{ if (o.isMesh){ o.castShadow = true; } });
    const state = { t: Math.random()*10 };

    function update(dt, target){
      state.t += dt;
      const followX = target.x - Math.sin(target.rotY) * 1.4 - Math.cos(target.rotY) * 0.9;
      const followZ = target.z - Math.cos(target.rotY) * 1.4 + Math.sin(target.rotY) * 0.9;
      const ease = 1 - Math.pow(0.0001, dt);
      built.group.position.x += (followX - built.group.position.x) * ease;
      built.group.position.z += (followZ - built.group.position.z) * ease;
      const bob = Math.sin(state.t * built.bobSpeed) * built.bobHeight;
      built.group.position.y = target.y + built.hoverBase + bob;
      const dx = target.x - built.group.position.x, dz = target.z - built.group.position.z;
      if (Math.hypot(dx, dz) > 0.05) built.group.rotation.y = Math.atan2(dx, dz);
      if (built.legs){
        built.legs.forEach((leg, i)=>{
          leg.rotation.x = Math.sin(state.t * built.bobSpeed + i) * 0.35;
        });
      }
    }

    return { group: built.group, update };
  }

  window.Bloxyard.Pet = { buildPet };
})();
