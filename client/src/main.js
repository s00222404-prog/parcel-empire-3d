import './style.css';
import * as THREE from 'three';

const host = document.querySelector('#map');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#193638');
scene.fog = new THREE.Fog('#193638', 42, 115);

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 180);
camera.position.set(25, 29, 34);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
host.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight('#d7eee4', '#405b56', 2.0));
const sun = new THREE.DirectionalLight('#fff1d1', 3.1);
sun.position.set(-22, 38, 18);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -48; sun.shadow.camera.right = 48;
sun.shadow.camera.top = 48; sun.shadow.camera.bottom = -48;
sun.shadow.bias = -0.0002;
scene.add(sun);

const city = new THREE.Group();
scene.add(city);
const mats = {
  ground: new THREE.MeshStandardMaterial({color:'#294b48',roughness:1}),
  block: new THREE.MeshStandardMaterial({color:'#3b625a',roughness:1}),
  road: new THREE.MeshStandardMaterial({color:'#253236',roughness:.96}),
  sidewalk: new THREE.MeshStandardMaterial({color:'#82958a',roughness:1}),
  line: new THREE.MeshStandardMaterial({color:'#d8d8b4',roughness:1}),
  glassA: new THREE.MeshStandardMaterial({color:'#799a94',roughness:.72}),
  glassB: new THREE.MeshStandardMaterial({color:'#a3b6a0',roughness:.8}),
  glassC: new THREE.MeshStandardMaterial({color:'#526f70',roughness:.78}),
  roof: new THREE.MeshStandardMaterial({color:'#263b3a',roughness:1}),
  park: new THREE.MeshStandardMaterial({color:'#47745a',roughness:1}),
  tree: new THREE.MeshStandardMaterial({color:'#3d7657',roughness:1}),
  trunk: new THREE.MeshStandardMaterial({color:'#795f45',roughness:1})
};
function box(w,h,d,mat,x,y,z,parent=city){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  mesh.position.set(x,y+h/2,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
}
function flat(w,d,mat,x,z,y=.02,parent=city){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,.08,d),mat);
  mesh.position.set(x,y,z);mesh.receiveShadow=true;parent.add(mesh);return mesh;
}

// A continuous ground plane and a regular street grid; no economy or delivery mechanics.
flat(100,100,mats.ground,0,0,-.16);
const mapSize=72, roadWidth=5.2, blockSize=12.8, pitch=blockSize+roadWidth;
for(let i=-2;i<=2;i++){
  const p=i*pitch;
  flat(mapSize,roadWidth,mats.road,0,p,.01);
  flat(roadWidth,mapSize,mats.road,p,0,.012);
  // Sidewalk ribbons along both sides of each road.
  for(const s of [-1,1]){
    flat(mapSize,.62,mats.sidewalk,0,p+s*(roadWidth/2+.31),.06);
    flat(.62,mapSize,mats.sidewalk,p+s*(roadWidth/2+.31),0,.06);
  }
  // Broken lane markings on the main avenues.
  for(let t=-32;t<=32;t+=4.8){
    flat(1.65,.11,mats.line,t,p,.07);
    flat(.11,1.65,mats.line,p,t,.07);
  }
}
// Distinct city blocks fill the spaces between roads.
const palettes=[mats.glassA,mats.glassB,mats.glassC];
function makeBuilding(x,z,w,d,h,seed){
  const base=box(w,h,d,palettes[seed%palettes.length],x,.12,z);
  // Flat dark rooftop and a small roof plant room make silhouettes readable from above.
  box(w+.08,.24,d+.08,mats.roof,x,h+.12,z);
  if(seed%3!==0) box(w*.28,.55,d*.3,mats.glassC,x-w*.12,h+.48,z+d*.08);
  // Recessed-looking window bands, kept as simple geometry for mobile performance.
  const windowMat=new THREE.MeshStandardMaterial({color:seed%2?'#d9dfb5':'#d1e3d0',emissive:'#53665a',emissiveIntensity:.14,roughness:.8});
  const rows=Math.min(8,Math.floor(h/1.65));
  const cols=Math.min(5,Math.floor(w/1.55));
  for(let row=0;row<rows;row++){
    for(let col=0;col<cols;col++){
      const wx=x-w/2+(col+.5)*w/cols, wy=1.05+row*(h-1.3)/Math.max(rows,1), wz=z+d/2+.012;
      const pane=new THREE.Mesh(new THREE.BoxGeometry(Math.min(.42,w/cols*.38),.48,.035),windowMat);
      pane.position.set(wx,wy,wz);city.add(pane);
      const pane2=pane.clone();pane2.position.z=z-d/2-.012;city.add(pane2);
    }
  }
  return base;
}
function makeTree(x,z,scale=1){
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.12*scale,.18*scale,.75*scale,5),mats.trunk);
  trunk.position.set(x,.43*scale,z);trunk.castShadow=true;city.add(trunk);
  const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(.55*scale,1),mats.tree);
  crown.position.set(x,1.08*scale,z);crown.castShadow=true;city.add(crown);
}
let seed=0;
for(let gx=-2;gx<2;gx++) for(let gz=-2;gz<2;gz++){
  const cx=(gx+.5)*pitch, cz=(gz+.5)*pitch;
  flat(blockSize,blockSize,mats.block,cx,cz,.08);
  const parkBlock=(gx===-1&&gz===0)||(gx===1&&gz===-1);
  if(parkBlock){
    flat(blockSize-1.3,blockSize-1.3,mats.park,cx,cz,.15);
    for(let i=0;i<8;i++){
      const a=(i%4)-1.5,b=Math.floor(i/4)*4-2;
      makeTree(cx+a*2.5,cz+b,0.8+(i%3)*.1);
    }
    // Small path crossing the green square.
    flat(blockSize-2,1.0,mats.sidewalk,cx,cz,.22);
    flat(1.0,blockSize-2,mats.sidewalk,cx,cz,.23);
  } else {
    const count=3+(Math.abs(gx+gz)%3);
    for(let i=0;i<count;i++){
      const col=i%2,row=Math.floor(i/2);
      const bw=3.2+(i%3)*.45,bd=3.1+((i+1)%2)*.6;
      const bx=cx+(col-.5)*5.2+(row%2)*.5;
      const bz=cz+(row-(Math.ceil(count/2)-1)/2)*4.3;
      const height=5.5+((Math.abs(gx*7+gz*11+i*13))%5)*2.25;
      makeBuilding(bx,bz,bw,bd,height,seed++);
    }
    // Street trees line selected block edges.
    for(let i=-2;i<=2;i++) if((i+gx+gz)%2===0) makeTree(cx+i*2.2,cz+5.15,.65);
  }
}
// Low raised edge helps the map read as a model rather than an infinite plane.
const edgeMat=new THREE.MeshStandardMaterial({color:'#58736b',roughness:1});
box(74,.3,.45,edgeMat,0,-.08,-36.8);
box(74,.3,.45,edgeMat,0,-.08,36.8);
box(.45,.3,74,edgeMat,-36.8,-.08,0);
box(.45,.3,74,edgeMat,36.8,-.08,0);

const target=new THREE.Vector3(0,0,0);
let yaw=.72, pitchAngle=.91, radius=63;
let dragging=false, lastX=0,lastY=0, moved=false;
function updateCamera(){
  pitchAngle=THREE.MathUtils.clamp(pitchAngle,.28,1.18);
  radius=THREE.MathUtils.clamp(radius,28,86);
  camera.position.set(target.x+radius*Math.sin(yaw)*Math.cos(pitchAngle),radius*Math.sin(pitchAngle),target.z+radius*Math.cos(yaw)*Math.cos(pitchAngle));
  camera.lookAt(target);
}
updateCamera();
renderer.domElement.addEventListener('pointerdown',e=>{dragging=true;moved=false;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(!dragging)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;if(Math.abs(dx)+Math.abs(dy)>2)moved=true;yaw-=dx*.006;pitchAngle+=dy*.004;lastX=e.clientX;lastY=e.clientY;updateCamera();});
renderer.domElement.addEventListener('pointerup',()=>{dragging=false;});
renderer.domElement.addEventListener('pointercancel',()=>{dragging=false;});
renderer.domElement.addEventListener('wheel',e=>{radius+=e.deltaY*.035;updateCamera();},{passive:true});
document.querySelector('#zoom-in').addEventListener('click',()=>{radius-=5;updateCamera();});
document.querySelector('#zoom-out').addEventListener('click',()=>{radius+=5;updateCamera();});
document.querySelector('#reset-view').addEventListener('click',()=>{yaw=.72;pitchAngle=.91;radius=63;target.set(0,0,0);updateCamera();});
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));}
addEventListener('resize',resize);
function animate(){requestAnimationFrame(animate);renderer.render(scene,camera);}
animate();
