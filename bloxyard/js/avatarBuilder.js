window.Bloxyard = window.Bloxyard || {};

const DEFAULT_COLORS = { head:0xf2d74e, torso:0x1fa347, pants:0x2e4fa3 };
const DEFAULT_ACCESSORIES = {
  hat:false, hatColor:0x333333,
  face:'smile',
  hoodie:false, hoodieColor:0x8a8f99,
  backpack:false, backpackColor:0xdb3c3c,
  pantsStyle:null,
  pet:null,
};

const PANTS_STYLES = {
  jeans:  { base:0x2e4fa3, accent:0x1c3170 },
  cargo:  { base:0x556b2f, accent:0x3f4f22 },
  track:  { base:0x1a1a1a, accent:0xdb3c3c },
};

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

// Transparent-background decals laid over the head as their own plane so
// they work no matter what the head's underlying shape is.
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

let sharedSadFaceTexture = null;
function getSadFaceTexture(){
  if (sharedSadFaceTexture) return sharedSadFaceTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');

  g.fillStyle = '#1a1a1a';
  g.beginPath(); g.ellipse(88, 116, 13, 18, 0, 0, Math.PI*2); g.fill();
  g.beginPath(); g.ellipse(168, 116, 13, 18, 0, 0, Math.PI*2); g.fill();

  // Worried/sad brows: inner corners raised, outer corners drooping.
  g.strokeStyle = '#1a1a1a';
  g.lineWidth = 8;
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(70, 96); g.lineTo(104, 82); g.stroke();
  g.beginPath(); g.moveTo(186, 96); g.lineTo(152, 82); g.stroke();

  // A frown is the top arc of a circle: its peak (near the nose) sits
  // higher than its drooping corners, the mirror image of the smile arc.
  g.lineWidth = 11;
  g.beginPath();
  g.arc(128, 198, 44, 1.18*Math.PI, 1.82*Math.PI);
  g.stroke();

  sharedSadFaceTexture = new THREE.CanvasTexture(c);
  sharedSadFaceTexture.anisotropy = 4;
  return sharedSadFaceTexture;
}

// Angry X-eyes + frown decal for zombies, same transparent-plane approach.
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

function buildCharacter(colors, accessories, faceType){
  colors = colors || DEFAULT_COLORS;
  accessories = accessories || DEFAULT_ACCESSORIES;

  const group = new THREE.Group();
  // Phong + modest specular gives the glossy "plastic toy" sheen real
  // Roblox avatars have, instead of a flat matte look.
  const plasticProps = { shininess:70, specular:0x555555 };
  const skin = new THREE.MeshPhongMaterial({ color:colors.head, ...plasticProps });

  // A hoodie recolors the torso and sleeves (long sleeves), replacing the
  // plain t-shirt look, and adds a hood bump at the neck.
  const torsoColor = accessories.hoodie ? accessories.hoodieColor : colors.torso;
  const shirt = new THREE.MeshPhongMaterial({ color:torsoColor, ...plasticProps });
  const armMat = accessories.hoodie ? shirt : skin;

  // A pants item overrides the plain color swatch with its own themed
  // color; the base leg material is shared, an accent mesh adds detail.
  const pantsStyle = accessories.pantsStyle && PANTS_STYLES[accessories.pantsStyle];
  const pantsColor = pantsStyle ? pantsStyle.base : colors.pants;
  const pants = new THREE.MeshPhongMaterial({ color:pantsColor, ...plasticProps });

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

  if (pantsStyle){
    const accentMat = new THREE.MeshPhongMaterial({ color:pantsStyle.accent, ...plasticProps });
    [leftLeg, rightLeg].forEach(leg=>{
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, legH*0.85, legD+0.02), accentMat);
      stripe.position.set(legW/2 - 0.02, -legH/2, 0);
      stripe.castShadow = true;
      leg.add(stripe);
    });
  }

  const torso = new THREE.Mesh(torsoGeom, shirt);
  torso.position.set(0, hipY + torsoH/2, 0);
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  const shoulderY = hipY + torsoH - 0.12;
  const leftArm = limb(armGeom, armMat, -(torsoW/2+armW/2), shoulderY, armH);
  const rightArm = limb(armGeom, armMat, (torsoW/2+armW/2), shoulderY, armH);
  group.add(leftArm, rightArm);

  if (accessories.hoodie){
    const hood = new THREE.Mesh(roundedBoxGeometry(0.5, 0.34, 0.4, 0.12), shirt);
    hood.position.set(0, hipY + torsoH + 0.06, -torsoD/2 - 0.02);
    hood.rotation.x = -0.35;
    hood.castShadow = true;
    group.add(hood);
    const stringMat = new THREE.MeshPhongMaterial({ color:0xffffff, ...plasticProps });
    [-0.12, 0.12].forEach(sx=>{
      const string = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 6), stringMat);
      string.position.set(sx, hipY + torsoH - 0.05, torsoD/2 + 0.02);
      group.add(string);
    });
  }

  if (accessories.backpack){
    const bpMat = new THREE.MeshPhongMaterial({ color:accessories.backpackColor, ...plasticProps });
    const backpack = new THREE.Mesh(roundedBoxGeometry(0.55, 0.62, 0.28, 0.1), bpMat);
    backpack.position.set(0, hipY + torsoH/2 + 0.03, -(torsoD/2 + 0.16));
    backpack.castShadow = true;
    backpack.receiveShadow = true;
    group.add(backpack);
  }

  const head = new THREE.Mesh(headGeom, skin);
  head.position.set(0, hipY + torsoH + headS/2, 0);
  head.castShadow = true;
  head.receiveShadow = true;
  group.add(head);

  const faceKey = faceType || accessories.face || 'smile';
  const faceTex = faceKey === 'zombie' ? getZombieFaceTexture()
    : faceKey === 'sad' ? getSadFaceTexture()
    : getFaceTexture();
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

window.Bloxyard.AvatarBuilder = { DEFAULT_COLORS, DEFAULT_ACCESSORIES, PANTS_STYLES, buildCharacter, applyCharColors };
