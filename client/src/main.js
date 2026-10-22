import './style.css';
import * as THREE from 'three';

const host = document.querySelector('#map');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#b7d4d0');
scene.fog = new THREE.Fog('#b7d4d0', 125, 230);

const camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, 0.1, 420);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
host.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight('#f1fbff', '#718c80', 2.1));
const sun = new THREE.DirectionalLight('#fff4d8', 2.5);
sun.position.set(-45, 70, 25);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -80; sun.shadow.camera.right = 80;
sun.shadow.camera.top = 80; sun.shadow.camera.bottom = -80;
scene.add(sun);

const world = new THREE.Group();
scene.add(world);
const mat = (color, roughness=1, extra={}) => new THREE.MeshStandardMaterial({color, roughness, ...extra});
const materials = {
  land: mat('#8cae91'), field: mat('#9cbd9b'), road: mat('#343f45'), roadEdge: mat('#d5d5c2'),
  sidewalk: mat('#d1d3c5'), white: mat('#f4f0d8'), yellow: mat('#f4cf69'),
  water: mat('#48a9b7', .25, {metalness:.08}), waterLight: mat('#91d5d6', .3),
  bridge: mat('#c8c9bc'), bridgeSide: mat('#788d8c'), pole: mat('#303e42'),
  red: mat('#fa5b56', .35, {emissive:'#7c1515',emissiveIntensity:.35}),
  amber: mat('#ffc85d', .35, {emissive:'#755018',emissiveIntensity:.25}),
  green: mat('#7ef09a', .35, {emissive:'#166c35',emissiveIntensity:.4})
};

function slab(w,h,d,material,x,y,z,parent=world,shadow=false){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  mesh.position.set(x,y,z);
  mesh.receiveShadow=true;
  mesh.castShadow=shadow;
  parent.add(mesh);
  return mesh;
}
function flat(w,d,material,x,z,y=.03,parent=world){
  return slab(w,.12,d,material,x,y,z,parent);
}

// One continuous, empty landscape: no buildings or structures except roads and bridges.
flat(170,140,materials.land,0,-1,-.18);
for(let x=-75;x<=75;x+=15) for(let z=-60;z<=60;z+=15){
  if(((x/15+z/15)%3)===0) flat(13.8,13.8,materials.field,x,z,-.08);
}

// Main roads are laid out first; river and bridges are layered above them.
const xRoads=[-60,-40,-20,0,20,40,60];
const zRoads=[-50,-30,-10,10,30,50];
for(const z of zRoads){
  flat(158,7.4,materials.road,0,z,.015);
  flat(158,.34,materials.sidewalk,0,z-4.05,.075);
  flat(158,.34,materials.sidewalk,0,z+4.05,.075);
  for(let x=-76;x<77;x+=7.5) flat(3.2,.18,materials.white,x,z,.105);
}
for(const x of xRoads){
  flat(7.4,128,materials.road,x,0,.02);
  flat(.34,128,materials.sidewalk,x-4.05,0,.078);
  flat(.34,128,materials.sidewalk,x+4.05,0,.078);
  for(let z=-61;z<62;z+=7.5) flat(.18,3.2,materials.white,x,z,.11);
}
// Crosswalks at each large junction.
for(const x of xRoads) for(const z of zRoads){
  for(let k=-2;k<=2;k++){
    flat(.65,3.6,materials.white,x+k*1.15,z-4.8,.12);
    flat(3.6,.65,materials.white,x-4.8,z+k*1.15,.12);
  }
}

// Recessed canal along the boundary between city areas, not through the city centre.
const canalShape=new THREE.Shape();
canalShape.moveTo(37,72); canalShape.bezierCurveTo(34,50,40,37,38,18);
canalShape.bezierCurveTo(36,0,43,-15,40,-32); canalShape.bezierCurveTo(37,-48,42,-60,39,-72);
canalShape.lineTo(58,-72); canalShape.bezierCurveTo(61,-55,55,-44,58,-29);
canalShape.bezierCurveTo(61,-10,54,4,57,20); canalShape.bezierCurveTo(60,39,54,52,58,72); canalShape.closePath();
const canalBed=new THREE.Mesh(new THREE.ShapeGeometry(canalShape,40),mat('#536e68'));
canalBed.rotation.x=-Math.PI/2; canalBed.position.y=-.42; canalBed.receiveShadow=true; world.add(canalBed);
const waterShape=new THREE.Shape();
waterShape.moveTo(42,72); waterShape.bezierCurveTo(39,50,45,37,43,18);
waterShape.bezierCurveTo(41,0,48,-15,45,-32); waterShape.bezierCurveTo(42,-48,47,-60,44,-72);
waterShape.lineTo(52,-72); waterShape.bezierCurveTo(55,-55,49,-44,52,-29);
waterShape.bezierCurveTo(55,-10,48,4,51,20); waterShape.bezierCurveTo(54,39,48,52,52,72); waterShape.closePath();
const water=new THREE.Mesh(new THREE.ShapeGeometry(waterShape,40),materials.water);
water.rotation.x=-Math.PI/2; water.position.y=-.19; water.receiveShadow=true; world.add(water);
// Raised grass embankments and concrete channel edges.
const bankMat=mat('#71947c');
for(const side of [-1,1]){
  const x=side<0?39.5:55.5;
  slab(4.5,.42,144,bankMat,x,-.02,0,world);
  slab(.34,.18,144,materials.sidewalk,side<0?41.5:53,-.02,0);
}
// Bridges cross the channel at actual road approaches and connect both sides.
function makeBridge(position, centerZ=0){
  slab(21,.42,8.2,materials.bridge,position,.18,centerZ,world,true);
  for(const side of [-1,1]){
    slab(21,.18,.2,materials.bridgeSide,position,.55,centerZ+side*3.85);
    for(let t=-9;t<=9;t+=3) slab(.14,.5,.14,materials.bridgeSide,position+t,.78,centerZ+side*3.85);
  }
  for(let t=-7;t<=7;t+=4) flat(2.1,.13,materials.yellow,position+t,centerZ,.42);
}
for(const z of [-48,-24,0,24,48]) makeBridge(49,z);

// The regional map contains 33 distinct, named city areas. Buildings remain disabled.
function cityLabel(name,x,z){
  const canvas=document.createElement('canvas'); canvas.width=512; canvas.height=128;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='rgba(15,37,38,.82)'; ctx.beginPath(); ctx.roundRect(8,8,496,112,22); ctx.fill();
  ctx.strokeStyle='#d4ff63'; ctx.lineWidth=4; ctx.stroke();
  ctx.font='700 42px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='#f2f7e9';
  ctx.fillText(name,256,64);
  const texture=new THREE.CanvasTexture(canvas); texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));
  sprite.position.set(x,1.8,z); sprite.scale.set(10,2.5,1); world.add(sprite);
}
const cityX=[-70,-56,-42,-28,-14,0,64,69,74,79,84];
const cityZ=[-48,0,48];
let cityIndex=1;
for(const z of cityZ) for(const x of cityX){
  cityLabel('ГОРОД '+String(cityIndex).padStart(2,'0'),x,z);
  cityIndex++;
}
// Traffic lights on corners of selected intersections; each has red, amber and green lenses.
function trafficLight(x,z,rotation=0){
  const group=new THREE.Group();
  group.position.set(x,.12,z);group.rotation.y=rotation;world.add(group);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.09,.12,2.5,8),materials.pole);
  pole.position.y=1.25;pole.castShadow=true;group.add(pole);
  const arm=slab(.12,.12,.8,materials.pole,0,2.35,-.28,group);
  const housing=slab(.48,.95,.38,materials.pole,0,2.05,-.68,group);
  for(const [i,m] of [[0,materials.red],[1,materials.amber],[2,materials.green]]){
    const lens=new THREE.Mesh(new THREE.SphereGeometry(.115,12,10),m);
    lens.position.set(0,2.34-i*.29,-.89);group.add(lens);
  }
  slab(.75,.12,.75,materials.pole,0,.13,0,group);
}
for(const [x,z] of [[-40,-30],[-20,-10],[0,10],[20,30],[40,-10],[-60,30],[60,10]]){
  trafficLight(x+4.8,z+4.8,Math.PI/4);
  trafficLight(x-4.8,z-4.8,-Math.PI/4);
}

// A few low islands and pedestrian paths to give the empty map scale, without any buildings.
for(const [x,z] of [[-50,0],[50,0],[-40,40],[40,-40]]){
  flat(6.2,2.0,materials.field,x,z,.12);
  flat(1.1,1.1,materials.sidewalk,x,z,.2);
}

const target=new THREE.Vector3(0,0,0);
let yaw=.48,pitchAngle=.9,radius=155;
let dragging=false,lastX=0,lastY=0;
function updateCamera(){
  pitchAngle=THREE.MathUtils.clamp(pitchAngle,.38,1.25);
  radius=THREE.MathUtils.clamp(radius,72,190);
  camera.position.set(target.x+radius*Math.sin(yaw)*Math.cos(pitchAngle),radius*Math.sin(pitchAngle),target.z+radius*Math.cos(yaw)*Math.cos(pitchAngle));
  camera.lookAt(target);
}
updateCamera();
renderer.domElement.style.touchAction='none';
renderer.domElement.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;yaw-=dx*.005;pitchAngle+=dy*.0035;lastX=e.clientX;lastY=e.clientY;updateCamera();});
renderer.domElement.addEventListener('pointerup',()=>dragging=false);
renderer.domElement.addEventListener('pointercancel',()=>dragging=false);
renderer.domElement.addEventListener('wheel',e=>{radius+=e.deltaY*.045;updateCamera();},{passive:true});
document.querySelector('#zoom-in')?.addEventListener('click',()=>{radius-=8;updateCamera();});
document.querySelector('#zoom-out')?.addEventListener('click',()=>{radius+=8;updateCamera();});
document.querySelector('#reset-view')?.addEventListener('click',()=>{yaw=.48;pitchAngle=.9;radius=155;target.set(0,0,0);updateCamera();});
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));}
addEventListener('resize',resize);
function animate(){requestAnimationFrame(animate);renderer.render(scene,camera);}
animate();
