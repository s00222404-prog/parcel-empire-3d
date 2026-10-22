import * as THREE from 'three';
import './style.css';

const canvas = document.querySelector('#world');
const moneyEl = document.querySelector('#balance');
const levelEl = document.querySelector('#level');
const deliveriesEl = document.querySelector('#deliveries');
const noticeEl = document.querySelector('#notice');
const deliverBtn = document.querySelector('#deliver');
const statusEl = document.querySelector('#session-status');
const guideEl=document.querySelector('#guide');
const guideNumber=document.querySelector('#guide-number');
const guideTitle=document.querySelector('#guide-title');
const guideText=document.querySelector('#guide-text');
const guideProgress=document.querySelector('#guide-progress');
const guideNext=document.querySelector('#guide-next');
const tabPanel=document.querySelector('#tab-panel');
const tabTitle=document.querySelector('#tab-title');
const tabEyebrow=document.querySelector('#tab-eyebrow');
const tabDescription=document.querySelector('#tab-description');
const tabAction=document.querySelector('#tab-action');
const tg = window.Telegram?.WebApp;
const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
let balance = 1000, deliveries = 0, level = 1, busy = false, jobActive = false, guideStep = 1;
const moveButtons = document.querySelectorAll('[data-move]');

if (tg) {
  tg.ready(); tg.expand();
  tg.setHeaderColor?.('#101c22'); tg.setBackgroundColor?.('#101c22');
}
const scene = new THREE.Scene();
scene.background = new THREE.Color('#203d45');
scene.fog = new THREE.Fog('#203d45', 20, 65);
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .1, 150);
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
scene.add(new THREE.HemisphereLight('#d9f4ee','#30464b',2.1));
const sun = new THREE.DirectionalLight('#fff0cf',3.1);
sun.position.set(-9,18,10); sun.castShadow = true; sun.shadow.mapSize.set(1024,1024); scene.add(sun);
const mat = (color, roughness=.82) => new THREE.MeshStandardMaterial({color,roughness});
function box(w,h,d,material,x,y,z,parent=scene){
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
}
box(100,.025,100,mat('#314d4d'),0,-.08,0).rotation.x=-Math.PI/2;
const road=mat('#17282e'), lane=mat('#9cae9b');
for(let i=-4;i<=4;i++){
  box(1.55,.025,70,road,i*5,.005,0); box(70,.025,1.55,road,0,.008,i*5);
  for(let j=-32;j<=32;j+=2.4){box(.045,.012,.9,lane,i*5,.025,j);box(.9,.012,.045,lane,j,.028,i*5);}
}
const city=new THREE.Group();scene.add(city);
const buildingMats=['#5d7b78','#82968a','#b0a58a','#47666b','#a1b5a5'].map(c=>mat(c));
const windowMat=new THREE.MeshStandardMaterial({color:'#e1edb4',emissive:'#8da75a',emissiveIntensity:.32,roughness:.4});
for(let gx=-4;gx<=4;gx++)for(let gz=-4;gz<=4;gz++){
  if(Math.abs(gx)<2&&Math.abs(gz)<2)continue;
  const x=gx*5+(Math.random()-.5)*.65,z=gz*5+(Math.random()-.5)*.65,w=1.7+Math.random()*1.2,d=1.7+Math.random()*1.2,h=1.1+Math.random()*5.2;
  box(w,h,d,buildingMats[Math.floor(Math.random()*buildingMats.length)],x,h/2,z,city);
  for(let yy=.45;yy<h-.2;yy+=.65)for(let xx=-w/2+.3;xx<w/2-.1;xx+=.48)box(.12,.2,.025,windowMat,x+xx,yy,z+d/2+.015,city);
}
const depot=new THREE.Group();scene.add(depot);
box(3.5,.65,2.5,mat('#d7ff64'),-2.5,.34,2.5,depot);
box(3.1,1.3,2.1,mat('#d5dfcf'),-2.5,1.25,2.5,depot);
box(3.35,.12,2.35,mat('#182b2d'),-2.5,1.97,2.5,depot);
box(.12,.8,.04,mat('#233a3b'),-2.5,1.1,3.57,depot);
for(let i=0;i<3;i++)box(.38,.48,.035,mat('#a2c5a8'),-3.35+i*.82,1.4,3.58,depot);
const marker=new THREE.Mesh(new THREE.TorusGeometry(.9,.035,8,48),mat('#d7ff64'));marker.rotation.x=-Math.PI/2;marker.position.set(-2.5,.12,2.5);scene.add(marker);
const van=new THREE.Group();scene.add(van);
box(1.05,.55,1.5,mat('#d7ff64'),0,.53,0,van);box(.83,.4,.48,mat('#dbe7db'),0,.96,-.39,van);box(.86,.22,.05,mat('#34545a'),0,.99,-.645,van);
for(const x of [-.42,.42])for(const z of [-.48,.48]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.17,.17,.12,16),mat('#10191c'));wheel.rotation.z=Math.PI/2;wheel.position.set(x,.25,z);van.add(wheel);}
van.position.set(-2.5,0,5.2);
const target=new THREE.Vector3(2.5,0,-2.5);
const pin=new THREE.Mesh(new THREE.SphereGeometry(.22,16,12),mat('#ffb45c'));pin.position.set(target.x,.55,target.z);scene.add(pin);
const ring=new THREE.Mesh(new THREE.TorusGeometry(.42,.035,8,32),mat('#ffb45c'));ring.rotation.x=-Math.PI/2;ring.position.set(target.x,.08,target.z);scene.add(ring);
let orbit=0,zoom=1,dragging=false,lastX=0,lastY=0;
canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!dragging)return;orbit+=(e.clientX-lastX)*.006;zoom=THREE.MathUtils.clamp(zoom+(e.clientY-lastY)*.002,.7,1.5);lastX=e.clientX;lastY=e.clientY;});
canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);
canvas.addEventListener('wheel',e=>{zoom=THREE.MathUtils.clamp(zoom+e.deltaY*.001,.7,1.5);},{passive:true});
async function api(path,body){
  if(!tg?.initData||!apiBase)throw new Error('Open this Mini App in Telegram to sync your account.');
  const response=await fetch(apiBase+path,{method:body?'POST':'GET',headers:{Authorization:'tma '+tg.initData,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'API request failed');return data;
}
function updateHud(){moneyEl.textContent='$'+balance.toLocaleString('en-US');levelEl.textContent=String(level).padStart(2,'0');deliveriesEl.textContent=String(deliveries);}
async function syncPlayer(){
  if(!tg?.initData||!apiBase)return;
  try{const data=await api('/api/me');const p=data.player;balance=Number(p.balance);deliveries=Number(p.parcels_delivered);level=Number(p.level);updateHud();statusEl.textContent='ACCOUNT SYNCED';noticeEl.textContent='Telegram connected. Your deliveries are saved on the server.';}
  catch(e){statusEl.textContent='OFFLINE';noticeEl.textContent=e.message;}
}
function renderGuide(){
  if(guideStep>3){guideEl.hidden=true;return;}
  guideEl.hidden=false;guideNumber.textContent=String(guideStep);guideProgress.style.width=((guideStep/3)*100)+'%';
  const steps=[['Прими первый заказ','Нажми «Взять заказ». Твоя первая посылка появится на карте.','Понятно, дальше →'],['Управляй фургоном','Используй стрелки управления под заказом. Доедь до оранжевого маркера в центре города.','Я за рулём →'],['Заверши доставку','Подъедь к оранжевой точке. Награда начислится только после прибытия. Потом можно взять следующий заказ.','Начать игру →']];
  guideTitle.textContent=steps[guideStep-1][0];guideText.textContent=steps[guideStep-1][1];guideNext.textContent=steps[guideStep-1][2];
}
guideNext.addEventListener('click',()=>{if(guideStep===1&&!jobActive){jobActive=true;deliverBtn.querySelector('span').textContent='ДОСТАВКА В ПРОЦЕССЕ';statusEl.textContent='ЗАКАЗ АКТИВЕН';noticeEl.textContent='Заказ принят! Веди фургон к оранжевому маркеру.';}guideStep=Math.min(3,guideStep+1);if(guideStep===3&&deliveries>0)guideStep=4;renderGuide();});
document.querySelector('#guide-skip').addEventListener('click',()=>{guideStep=4;renderGuide();});
const tabs={city:['ГОРОД','Твой город','Поворачивай камеру и исследуй 3D-город. Оранжевый маркер показывает место доставки.'],orders:['ЗАКАЗЫ','Список заказов','Прими активный заказ на панели доставки. Выполняй доставки, чтобы получать деньги и открывать развитие.'],build:['СТРОИТЕЛЬСТВО','Развивай сеть','Строительство скоро откроется. Следующая цель — накопить деньги на новый склад и расширить зону доставки.'],garage:['ГАРАЖ','Твой автопарк','Пока у тебя один фургон. Новые машины и улучшения автопарка появятся на следующем этапе развития игры.']};
document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===button));const item=tabs[button.dataset.tab];tabEyebrow.textContent=item[0];tabTitle.textContent=item[1];tabDescription.textContent=item[2];tabAction.innerHTML=button.dataset.tab==='orders'?'<button type="button" id="tab-order-action">Перейти к заказу ↓</button>':'';tabPanel.hidden=false;if(button.dataset.tab==='orders')document.querySelector('#tab-order-action').addEventListener('click',()=>{tabPanel.hidden=true;deliverBtn.scrollIntoView({behavior:'smooth',block:'center'});});}));
document.querySelector('#tab-close').addEventListener('click',()=>tabPanel.hidden=true);
function finishDelivery(){
  if(!jobActive)return;
  const distance=Math.hypot(van.position.x-target.x,van.position.z-target.z);
  if(distance<1.35){balance+=25;deliveries++;level=Math.floor(deliveries/5)+1;jobActive=false;updateHud();deliverBtn.querySelector('span').textContent='ВЗЯТЬ СЛЕДУЮЩИЙ ЗАКАЗ';noticeEl.textContent='Доставка выполнена! +$25. Можешь взять следующий заказ.';statusEl.textContent='ЗАКАЗ ВЫПОЛНЕН';pin.visible=true;ring.visible=true;guideStep=4;renderGuide();}
}
deliverBtn.addEventListener('click',()=>{
  if(jobActive){noticeEl.textContent='Веди фургон к оранжевому маркеру стрелками управления.';return;}
  jobActive=true;pin.visible=true;ring.visible=true;deliverBtn.querySelector('span').textContent='ДОСТАВКА В ПРОЦЕССЕ';statusEl.textContent='ЗАКАЗ АКТИВЕН';noticeEl.textContent='Заказ принят. Доедь от склада до оранжевого маркера, чтобы получить $25.';
});
function moveVan(dx,dz){
  if(!jobActive){noticeEl.textContent='Сначала возьми заказ.';return;}
  const nx=THREE.MathUtils.clamp(van.position.x+dx,-16,16),nz=THREE.MathUtils.clamp(van.position.z+dz,-16,16);
  van.position.x=nx;van.position.z=nz;van.rotation.y=Math.atan2(dx,dz);
  finishDelivery();
}
moveButtons.forEach(button=>{
  const move=()=>{const dir=button.dataset.move;const step=1.0;moveVan(dir==='left'?-step:dir==='right'?step:0,dir==='up'?-step:dir==='down'?step:0);};
  button.addEventListener('pointerdown',e=>{e.preventDefault();move();});
});
