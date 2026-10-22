import './style.css';
import * as THREE from 'three';

const host = document.querySelector('#map');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#b7d4d0');
scene.fog = new THREE.Fog('#b7d4d0', 125, 230);

const camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, 0.1, 320);
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

// Wide, gently winding river polygon crossing the city from north to south.
const riverShape=new THREE.Shape();
riverShape.moveTo(-14,72);
riverShape.lineTo(-4,72);
riverShape.bezierCurveTo(-10,48,10,35,3,16);
riverShape.bezierCurveTo(-1,0,-14,-12,-7,-31);
riverShape.bezierCurveTo(-1,-47,10,-57,7,-72);
riverShape.lineTo(-9,-72);
riverShape.bezierCurveTo(-7,-53,-20,-44,-19,-29);
riverShape.bezierCurveTo(-21,-8,-7,2,-6,17);
riverShape.bezierCurveTo(-5,35,-22,49,-14,72);
const riverGeometry=new THREE.ShapeGeometry(riverShape,32);
const river=new THREE.Mesh(riverGeometry,materials.water);
river.rotation.x=-Math.PI/2;
river.position.y=.13;
river.receiveShadow=true;
world.add(river);

// Subtle banks along both sides of the river.
function bankRibbon(points, width, material){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(p[0],.18,p[1])));
  const pts=curve.getPoints(90);
  const verts=[],indices=[];
  for(let i=0;i<pts.length;i++){
    const tangent=curve.getTangent(i/(pts.length-1));
    const normal=new THREE.Vector3(-tangent.z,0,tangent.x).normalize();
    const a=pts[i].clone().addScaledVector(normal,width/2);
    const b=pts[i].clone().addScaledVector(normal,-width/2);
    verts.push(a.x,a.y,a.z,b.x,b.y,b.z);
    if(i<pts.length-1){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(indices);g.computeVertexNormals();
  const mesh=new THREE.Mesh(g,material);world.add(mesh);
}
bankRibbon([[-13,60],[-7,40],[-9,22],[-14,4],[-14,-15],[-5,-34],[0,-55]],.65,materials.waterLight);
bankRibbon([[-5,60],[1,40],[-2,22],[-7,4],[-7,-15],[2,-34],[7,-55]],.45,materials.waterLight);

// Bridge decks are placed exactly where roads meet the river.
function makeBridge(axis, position, centerZ=0){
  const length=axis==='x'?17:17;
  const deck=slab(axis==='x'?length:7.8,.65,axis==='x'?7.8:length,materials.bridge,axis==='x'?position:position,.52,axis==='x'?centerZ:position,world,true);
  // Raised edge rails with regular posts.
  for(const side of [-1,1]){
    if(axis==='x'){
      slab(length,.22,.22,materials.bridgeSide,position,.98,centerZ+side*3.65);
      for(let t=-7;t<=7;t+=3.5) slab(.16,.55,.16,materials.bridgeSide,position+t,1.18,centerZ+side*3.65);
    }else{
      slab(.22,.22,length,materials.bridgeSide,position+side*3.65,.98,position);
      for(let t=-7;t<=7;t+=3.5) slab(.16,.55,.16,materials.bridgeSide,position+side*3.65,1.18,position+t);
    }
  }
  // Dashed centre line across the deck.
  if(axis==='x') for(let t=-6;t<=6;t+=4) flat(2.1,.12,materials.yellow,position+t,centerZ,.86);
  else for(let t=-6;t<=6;t+=4) flat(.12,2.1,materials.yellow,position,position+t,.86);
}
makeBridge('x',0,0);
makeBridge('x',-20,-30);
makeBridge('x',20,30);
makeBridge('z',-20,-20);
makeBridge('z',20,20);

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
let yaw=.48,pitchAngle=.9,radius=126;
let dragging=false,lastX=0,lastY=0;
function updateCamera(){
  pitchAngle=THREE.MathUtils.clamp(pitchAngle,.38,1.25);
  radius=THREE.MathUtils.clamp(radius,58,155);
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
document.querySelector('#reset-view')?.addEventListener('click',()=>{yaw=.48;pitchAngle=.9;radius=126;target.set(0,0,0);updateCamera();});
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));}
addEventListener('resize',resize);
function animate(){requestAnimationFrame(animate);renderer.render(scene,camera);}
animate();
