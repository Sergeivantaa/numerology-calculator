window.Bloxyard = window.Bloxyard || {};

const DEFAULT_COLORS = { head:0xf2d74e, torso:0x1fa347, pants:0x2e4fa3 };
const DEFAULT_ACCESSORIES = { hat:false, hatColor:0x333333 };

function toCss(hex){ return '#' + hex.toString(16).padStart(6,'0'); }

// The classic Roblox "Robloxian" smiley decal, painted onto the head's
// front face so it matches whatever skin tone is currently selected.
function makeFaceTexture(skinHex){
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = toCss(skinHex);
  g.fillRect(0, 0, 256, 256);

  g.fillStyle = '#1a1a1a';
  g.beginPath(); g.ellipse(84, 112, 14, 20, 0, 0, Math.PI*2); g.fill();
  g.beginPath(); g.ellipse(172, 112, 14, 20, 0, 0, Math.PI*2); g.fill();

  g.strokeStyle = '#1a1a1a';
  g.lineWidth = 10;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(128, 132, 52, 0.18*Math.PI, 0.82*Math.PI);
  g.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  return tex;
}

function buildCharacter(colors, accessories){
  colors = colors || DEFAULT_COLORS;
  accessories = accessories || DEFAULT_ACCESSORIES;

  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color:colors.head, flatShading:true });
  const faceMat = new THREE.MeshLambertMaterial({ map: makeFaceTexture(colors.head) });
  const shirt = new THREE.MeshLambertMaterial({ color:colors.torso, flatShading:true });
  const pants = new THREE.MeshLambertMaterial({ color:colors.pants, flatShading:true });
  const armMat = skin;

  const legH=1.0, legW=0.42, legD=0.42;
  const torsoH=1.15, torsoW=1.0, torsoD=0.55;
  const headS=0.85;
  const armH=1.0, armW=0.4, armD=0.4;

  const hipY = legH;

  function limb(mat, w,h,d, pivotX, pivotY){
    const pivot = new THREE.Group();
    pivot.position.set(pivotX, pivotY, 0);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat);
    mesh.position.set(0, -h/2, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    pivot.add(mesh);
    return pivot;
  }

  const leftLeg = limb(pants, legW,legH,legD, -0.27, hipY);
  const rightLeg = limb(pants, legW,legH,legD, 0.27, hipY);
  group.add(leftLeg, rightLeg);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(torsoW,torsoH,torsoD), shirt);
  torso.position.set(0, hipY + torsoH/2, 0);
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  const shoulderY = hipY + torsoH - 0.12;
  const leftArm = limb(armMat, armW,armH,armD, -(torsoW/2+armW/2), shoulderY);
  const rightArm = limb(armMat, armW,armH,armD, (torsoW/2+armW/2), shoulderY);
  group.add(leftArm, rightArm);

  // Box materials are indexed [+x, -x, +y, -y, +z, -z]; the smiley goes on +z (front).
  const head = new THREE.Mesh(new THREE.BoxGeometry(headS,headS,headS),
    [skin, skin, skin, skin, faceMat, skin]);
  head.position.set(0, hipY + torsoH + headS/2, 0);
  head.castShadow = true;
  head.receiveShadow = true;
  group.add(head);

  let hat = null;
  const hatMat = new THREE.MeshLambertMaterial({ color: accessories.hatColor, flatShading:true });
  if (accessories.hat){
    hat = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.32, 0.95), hatMat);
    hat.position.set(0, hipY + torsoH + headS + 0.16, 0);
    hat.castShadow = true;
    group.add(hat);
  }

  return { group, leftLeg, rightLeg, leftArm, rightArm, torso, head, hat,
    materials: { head:skin, face:faceMat, torso:shirt, pants:pants, hat:hatMat } };
}

function applyCharColors(character, colors){
  character.materials.head.color.set(colors.head);
  character.materials.face.map = makeFaceTexture(colors.head);
  character.materials.face.map.needsUpdate = true;
  character.materials.torso.color.set(colors.torso);
  character.materials.pants.color.set(colors.pants);
}

window.Bloxyard.AvatarBuilder = { DEFAULT_COLORS, DEFAULT_ACCESSORIES, buildCharacter, applyCharColors };
