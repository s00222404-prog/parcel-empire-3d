import './style.css';
import * as THREE from 'three';

// Mobile-first regional map: one draw call per repeated box type, capped at 30 FPS.
const host = document.querySelector('#map');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#b7d4d0');
const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 5000);
const renderer = new THREE.WebGLRenderer({
  antialias: false,
  alpha: false,
  powerPreference: 'low-power',
  stencil: false,
  depth: true
});
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = false;
host.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight('#f1fbff', '#718c80', 1.55));
const sun = new THREE.DirectionalLight('#fff4d8', 1.1);
sun.position.set(-45, 70, 25);
scene.add(sun);

const map = new THREE.Group();
scene.add(map);
const material = (color, basic = false) => basic
  ? new THREE.MeshBasicMaterial({ color })
  : new THREE.MeshLambertMaterial({ color });
const M = {
  land: material('#8cae91', true),
  field: material('#9cbd9b', true),
  road: material('#343f45', true),
  edge: material('#d5d5c2', true),
  white: material('#f4f0d8', true),
  yellow: material('#f4cf69', true),
  bank: material('#bda77d', true),
  bed: material('#806f55', true),
  water: material('#36a8bd', true),
  bridge: material('#c8c9bc', true),
  rail: material('#788d8c', true),
  pole: material('#303e42', true),
  green: material('#7bcf92', true)
};

// Store repeated cuboids as transform data, then create a single InstancedMesh per type.
const batches = new Map();
const dummy = new THREE.Object3D();
function addBox(w, h, d, mat, x, y, z, rotY = 0) {
  const key = [w, h, d, mat.uuid].join(':');
  if (!batches.has(key)) batches.set(key, { w, h, d, mat, transforms: [] });
  batches.get(key).transforms.push({ x, y, z, rotY });
}
function addFlat(w, d, mat, x, z, y = 0) {
  addBox(w, 0.12, d, mat, x, y, z);
}

const columns = 6, rows = 6, citySpacingX = 310, citySpacingZ = 270;
const cities = [];
for (let row = 0; row < rows && cities.length < 33; row++) {
  for (let col = 0; col < columns && cities.length < 33; col++) {
    const x = col * citySpacingX + (row % 2 ? 34 : 0) + (col % 3) * 13;
    const z = row * citySpacingZ + (col % 2 ? 23 : 0) + (row % 3) * 11;
    cities.push({ id: cities.length + 1, x, z, col, row });
    // Compact 5x5 street grid per city; no decorative micro-geometry.
    addFlat(150, 150, M.land, x, z, -0.18);
    for (let i = -2; i <= 2; i++) {
      const offset = i * 25;
      addFlat(150, 7, M.road, x, z + offset, 0);
      addFlat(7, 150, M.road, x + offset, z, 0.01);
      addFlat(150, 0.3, M.edge, x, z + offset - 3.8, 0.07);
      addFlat(150, 0.3, M.edge, x, z + offset + 3.8, 0.07);
      addFlat(0.3, 150, M.edge, x + offset - 3.8, z, 0.07);
      addFlat(0.3, 150, M.edge, x + offset + 3.8, z, 0.07);
    }
    // A small green square park in every city.
    addFlat(18, 18, M.green, x + 42, z - 42, 0.02);
    for (let t = -1; t <= 1; t++) {
      addFlat(1.8, 0.2, M.white, x + 42 + t * 4, z - 42, 0.1);
      addFlat(0.2, 1.8, M.white, x + 42, z - 42 + t * 4, 0.1);
    }
  }
}

// Intercity roads, with wide gaps and recessed water channels between neighboring cities.
function roadBetween(a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const len = Math.hypot(dx, dz);
  const angle = Math.atan2(dx, dz);
  const midX = (a.x + b.x) / 2, midZ = (a.z + b.z) / 2;
  addBox(9, 0.18, len - 115, M.road, midX, 0.015, midZ, angle);
  addBox(0.28, 0.13, len - 115, M.edge, midX - Math.cos(angle) * 4.7, 0.09, midZ + Math.sin(angle) * 4.7, angle);
  addBox(0.28, 0.13, len - 115, M.edge, midX + Math.cos(angle) * 4.7, 0.09, midZ - Math.sin(angle) * 4.7, angle);
  // Sandy trench, dark bed and water are below ground level.
  if (Math.abs(dx) > Math.abs(dz)) {
    addFlat(24, 72, M.bank, midX, midZ, -0.16);
    addFlat(17, 72, M.bed, midX, midZ, -0.30);
    addFlat(10, 72, M.water, midX, midZ, -0.22);
    addBox(16, 0.48, 12, M.bridge, midX, 0.25, midZ, 0);
    addBox(16, 0.18, 0.22, M.rail, midX, 0.54, midZ - 5.6);
    addBox(16, 0.18, 0.22, M.rail, midX, 0.54, midZ + 5.6);
  } else {
    addFlat(72, 24, M.bank, midX, midZ, -0.16);
    addFlat(72, 17, M.bed, midX, midZ, -0.30);
    addFlat(72, 10, M.water, midX, midZ, -0.22);
    addBox(12, 0.48, 16, M.bridge, midX, 0.25, midZ, 0);
    addBox(0.22, 0.18, 16, M.rail, midX - 5.6, 0.54, midZ);
    addBox(0.22, 0.18, 16, M.rail, midX + 5.6, 0.54, midZ);
  }
}
for (const city of cities) {
  const right = cities.find(c => c.row === city.row && c.col === city.col + 1);
  const below = cities.find(c => c.row === city.row + 1 && c.col === city.col);
  if (right) roadBetween(city, right);
  if (below) roadBetween(city, below);
}

// Render all the map cuboids as instanced batches. This keeps draw calls low even with 33 cities.
for (const batch of batches.values()) {
  const geometry = new THREE.BoxGeometry(batch.w, batch.h, batch.d);
  const instances = new THREE.InstancedMesh(geometry, batch.mat, batch.transforms.length);
  instances.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  batch.transforms.forEach((t, i) => {
    dummy.position.set(t.x, t.y, t.z);
    dummy.rotation.set(0, t.rotY, 0);
    dummy.updateMatrix();
    instances.setMatrixAt(i, dummy.matrix);
  });
  instances.instanceMatrix.needsUpdate = true;
  instances.frustumCulled = true;
  map.add(instances);
}

// Labels are lightweight sprites, one per city.
function cityLabel(city) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(15,37,38,.9)';
  ctx.beginPath(); ctx.roundRect(4, 4, 248, 56, 12); ctx.fill();
  ctx.strokeStyle = '#d4ff63'; ctx.lineWidth = 2; ctx.stroke();
  ctx.font = 'bold 23px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f2f7e9';
  ctx.fillText('ГОРОД ' + String(city.id).padStart(2, '0'), 128, 32);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthWrite: false }));
  sprite.position.set(city.x, 2.8, city.z);
  sprite.scale.set(24, 6, 1);
  map.add(sprite);
}

// Sea is a single flat plane below the whole region.
const sea = new THREE.Mesh(new THREE.PlaneGeometry(2200, 1900), material('#287f91', true));
sea.rotation.x = -Math.PI / 2;
sea.position.set(780, -0.72, 680);
scene.add(sea);
cities.forEach(cityLabel);

const target = new THREE.Vector3(0, 0, 0);
let yaw = 0.55, pitch = 0.82, radius = 220;
let dragging = false, lastX = 0, lastY = 0;
function updateCamera() {
  pitch = THREE.MathUtils.clamp(pitch, 0.35, 1.25);
  radius = THREE.MathUtils.clamp(radius, 85, 1800);
  camera.position.set(
    target.x + radius * Math.sin(yaw) * Math.cos(pitch),
    radius * Math.sin(pitch),
    target.z + radius * Math.cos(yaw) * Math.cos(pitch)
  );
  camera.lookAt(target);
}
updateCamera();
const canvas = renderer.domElement;
canvas.style.touchAction = 'none';
canvas.addEventListener('pointerdown', e => {
  dragging = true; lastX = e.clientX; lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  if (!dragging) return;
  yaw -= (e.clientX - lastX) * 0.005;
  pitch += (e.clientY - lastY) * 0.0035;
  lastX = e.clientX; lastY = e.clientY;
  updateCamera();
});
canvas.addEventListener('pointerup', () => dragging = false);
canvas.addEventListener('pointercancel', () => dragging = false);
canvas.addEventListener('wheel', e => {
  radius += e.deltaY * 0.045; updateCamera();
}, { passive: true });
document.querySelector('#zoom-in')?.addEventListener('click', () => { radius -= 12; updateCamera(); });
document.querySelector('#zoom-out')?.addEventListener('click', () => { radius += 12; updateCamera(); });
document.querySelector('#reset-view')?.addEventListener('click', () => {
  yaw = 0.55; pitch = 0.82; radius = 220; target.set(0, 0, 0); updateCamera();
});
function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
}
addEventListener('resize', resize);

// Two lightweight processing systems (not extra game engines):
// 1) Adaptive quality controller lowers internal resolution when frame time rises.
// 2) Visibility / camera-distance culling skips city labels that cannot contribute to the view.
const perf = {
  lastSample: performance.now(),
  frames: 0,
  lastFpsUpdate: performance.now(),
  fps: 30,
  pixelRatio: Math.min(devicePixelRatio || 1, 1.5),
  slowSamples: 0,
  fastSamples: 0
};
const labelSprites = [];
map.traverse(obj => { if (obj.isSprite) labelSprites.push(obj); });
function updateLabelVisibility() {
  const maxLabelDistance = Math.max(300, radius * 1.25);
  for (const sprite of labelSprites) {
    sprite.visible = camera.position.distanceTo(sprite.position) < maxLabelDistance;
  }
}
function adaptQuality(now) {
  const elapsed = now - perf.lastSample;
  if (elapsed < 1000) return;
  perf.fps = Math.round((perf.frames * 1000) / elapsed);
  perf.frames = 0;
  perf.lastSample = now;
  // Keep the map sharp on phones while lowering resolution only if FPS actually drops.
  if (perf.fps < 18) {
    perf.slowSamples++;
    perf.fastSamples = 0;
  } else if (perf.fps > 29) {
    perf.fastSamples++;
    perf.slowSamples = 0;
  } else {
    perf.slowSamples = Math.max(0, perf.slowSamples - 1);
    perf.fastSamples = 0;
  }
  if (perf.slowSamples >= 2 && perf.pixelRatio > 1.0) {
    perf.pixelRatio = Math.max(1.0, perf.pixelRatio - 0.1);
    renderer.setPixelRatio(perf.pixelRatio);
    renderer.setSize(innerWidth, innerHeight);
    perf.slowSamples = 0;
  } else if (perf.fastSamples >= 8 && perf.pixelRatio < Math.min(devicePixelRatio || 1, 1.5)) {
    perf.pixelRatio = Math.min(Math.min(devicePixelRatio || 1, 1.5), perf.pixelRatio + 0.05);
    renderer.setPixelRatio(perf.pixelRatio);
    renderer.setSize(innerWidth, innerHeight);
    perf.fastSamples = 0;
  }
}

// Cap rendering to 30 FPS and pause completely when the tab is hidden.
let lastFrame = 0, frameRequested = false;
function animate(now) {
  frameRequested = false;
  if (document.hidden) return;
  if (now - lastFrame >= 33) {
    updateLabelVisibility();
    renderer.render(scene, camera);
    lastFrame = now;
    perf.frames++;
    adaptQuality(now);
  }
  frameRequested = true;
  requestAnimationFrame(animate);
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !frameRequested) requestAnimationFrame(animate);
});
requestAnimationFrame(animate);
