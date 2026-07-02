window.Bloxyard = window.Bloxyard || {};

const DEFAULT_COLORS = { head:0xf2d74e, torso:0x1fa347, pants:0x2e4fa3 };
const DEFAULT_ACCESSORIES = { hat:false, hatColor:0x333333 };

// A chunky rounded box (soap-bar shape): a rounded-rect profile extruded
// with a bevel, so the character reads as soft/plastic "Robloxian" blocks
// instead of sharp-edged cubes.
function roundedBoxGeometry(w, h, d, radius, bevelSegments){
  radius = Math.max(0.01, Math.min(radius, w/2 - 0.02, h/2 - 0.02));
  const x = -w/2, y = -h/2;
  const shape = new THREE.Shape();
  shape.moveTo(x, y + radius);
  shape.lineTo(x, y + h - radius);
  shape.quadraticCurveTo(x, y + h, x + radius, y + h);
  shape.lineTo(x + w - radius, y + h);
  shape.quadraticCurveTo(x + w, y + h, x + w, y + h - radius);
  shape.lineTo(x + w, y + radius);
  shape.quadraticCurveTo(x + w, y, x + w - radius, y);
  shape.lineTo(x + radius, y);
  shape.quadraticCurveTo(x, y, x, y + radius);

  const bevelThickness = radius * 0.55;
  const bevelSize = radius * 0.55;
  const geom = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.02, d - bevelThickness*2),
    bevelEnabled: true,
    bevelThickness,
    bevelSize,
    bevelSegments: bevelSegments || 4,
    curveSegments: 6,
  });
  geom.center();
  return geom;
}

// Transparent-background decal (eyes + smile), laid over the head as its
// own plane so it works no matter what the head's underlying shape is.
let sharedFaceTexture = null;
function getFaceTexture(){
  if (sharedFaceTexture) return sharedFaceTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');

  g.fillStyle = '#1a1a1a';
  g.beginPath(); g.ellipse(88, 108, 15, 21, 0, 0, Math.PI*2); g.fill();
  g.beginPath(); g.ellipse(168, 108, 15, 21, 0, 0, Math.PI*2); g.fill();

  g.strokeStyle = '#1a1a1a';
  g.lineWidth = 11;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(128, 128, 54, 0.18*Math.PI, 0.82*Math.PI);
  g.stroke();

  sharedFaceTexture = new THREE.CanvasTexture(c);
  sharedFaceTexture.anisotropy = 4;
  return sharedFaceTexture;
}

// A proper cap shape (domed crown + brim) instead of a flat slab, so it
// actually reads as a hat sitting on the head.
function buildHat(color, plasticProps){
  const mat = new THREE.MeshPhongMaterial({ color, ...plasticProps });
  const group = new THREE.Group();

  const crownRadius = 0.48;
  const crownThetaLength = Math.PI * 0.55;
  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(crownRadius, 16, 10, 0, Math.PI*2, 0, crownThetaLength),
    mat
  );
  group.add(crown);

  const brim = new THREE.Mesh(
    new THREE.CylinderGeometry(crownRadius*1.08, crownRadius*1.04, 0.05, 20),
    mat
  );
  brim.position.y = crownRadius * Math.cos(crownThetaLength);
  group.add(brim);

  group.traverse(o=>{ if (o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
  return { group, material: mat };
}

// Angry X-eyes + frown decal for zombies, same transparent-plane approach
// as the regular smiley so it drops onto any head shape.
let sharedZombieFaceTexture = null;
function getZombieFaceTexture(){
  if (sharedZombieFaceTexture) return sharedZombieFaceTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');

  g.strokeStyle = '#1a1a1a';
  g.lineWidth = 9;
  g.lineCap = 'round';
  [[73,93,103,123],[103,93,73,123]].forEach(([x1,y1,x2,y2])=>{
    g.beginPath(); g.moveTo(x1,y1); g.lineTo(x2,y2); g.stroke();
  });
  [[153,93,183,123],[183,93,153,123]].forEach(([x1,y1,x2,y2])=>{
    g.beginPath(); g.moveTo(x1,y1); g.lineTo(x2,y2); g.stroke();
  });

  g.lineWidth = 10;
  g.beginPath();
  g.arc(128, 175, 46, 1.12*Math.PI, 1.88*Math.PI);
  g.stroke();

  sharedZombieFaceTexture = new THREE.CanvasTexture(c);
  sharedZombieFaceTexture.anisotropy = 4;
  return sharedZombieFaceTexture;
}

function buildCharacter(colors, accessories, faceType){
  colors = colors || DEFAULT_COLORS;
  accessories = accessories || DEFAULT_ACCESSORIES;

  const group = new THREE.Group();
  // Phong + modest specular gives the glossy "plastic toy" sheen real
  // Roblox avatars have, instead of a flat matte look.
  const plasticProps = { shininess:70, specular:0x555555 };
  const skin = new THREE.MeshPhongMaterial({ color:colors.head, ...plasticProps });
  const shirt = new THREE.MeshPhongMaterial({ color:colors.torso, ...plasticProps });
  const pants = new THREE.MeshPhongMaterial({ color:colors.pants, ...plasticProps });
  const armMat = skin;

  const legH=1.0, legW=0.42, legD=0.42;
  const torsoH=1.15, torsoW=1.0, torsoD=0.55;
  const headS=0.85;
  const armH=1.0, armW=0.4, armD=0.4;

  const hipY = legH;

  const legGeom = roundedBoxGeometry(legW, legH, legD, 0.12);
  const armGeom = roundedBoxGeometry(armW, armH, armD, 0.12);
  const torsoGeom = roundedBoxGeometry(torsoW, torsoH, torsoD, 0.20);
  const headGeom = roundedBoxGeometry(headS, headS, headS, 0.24, 5);

  function limb(geom, mat, pivotX, pivotY, h){
    const pivot = new THREE.Group();
    pivot.position.set(pivotX, pivotY, 0);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(0, -h/2, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    pivot.add(mesh);
    return pivot;
  }

  const leftLeg = limb(legGeom, pants, -0.27, hipY, legH);
  const rightLeg = limb(legGeom, pants, 0.27, hipY, legH);
  group.add(leftLeg, rightLeg);

  const torso = new THREE.Mesh(torsoGeom, shirt);
  torso.position.set(0, hipY + torsoH/2, 0);
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  const shoulderY = hipY + torsoH - 0.12;
  const leftArm = limb(armGeom, armMat, -(torsoW/2+armW/2), shoulderY, armH);
  const rightArm = limb(armGeom, armMat, (torsoW/2+armW/2), shoulderY, armH);
  group.add(leftArm, rightArm);

  const head = new THREE.Mesh(headGeom, skin);
  head.position.set(0, hipY + torsoH + headS/2, 0);
  head.castShadow = true;
  head.receiveShadow = true;
  group.add(head);

  const faceTex = faceType === 'zombie' ? getZombieFaceTexture() : getFaceTexture();
  const faceMat = new THREE.MeshBasicMaterial({ map: faceTex, transparent:true, depthWrite:false });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(headS*0.72, headS*0.72), faceMat);
  face.position.set(0, head.position.y, headS/2 + 0.04);
  group.add(face);

  let hat = null;
  let hatMat = null;
  if (accessories.hat){
    const built = buildHat(accessories.hatColor, plasticProps);
    hat = built.group;
    hatMat = built.material;
    hat.position.set(0, hipY + torsoH + headS + 0.04, 0);
    group.add(hat);
  }

  return { group, leftLeg, rightLeg, leftArm, rightArm, torso, head, hat, face,
    materials: { head:skin, torso:shirt, pants:pants, hat:hatMat } };
}

function applyCharColors(character, colors){
  character.materials.head.color.set(colors.head);
  character.materials.torso.color.set(colors.torso);
  character.materials.pants.color.set(colors.pants);
}

window.Bloxyard.AvatarBuilder = { DEFAULT_COLORS, DEFAULT_ACCESSORIES, buildCharacter, applyCharColors };
