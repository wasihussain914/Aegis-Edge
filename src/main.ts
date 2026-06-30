/**
 * Aegis-Edge — Counter-UAS 3D simulation (seed scene).
 *
 * Renders the protected site: terrain, a procedural city, sensor sites with coverage volumes,
 * and several drones flying realistic waypoint paths. Each drone is classified by the deterministic
 * threat-call model (model/threatCall) and colored by threat. Click a drone to run the explainable
 * threat-call and see the plain-language "why". The overnight loop refines realism from here.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildings, sensors, tracks, SITE, type DroneTrack, type Waypoint } from "./data/scenario.js";
import { classify, explainTemplate, type Classification } from "./model/threatCall.js";

const THREAT_COLOR: Record<string, number> = { HIGH: 0xff4d5e, MED: 0xffc14d, LOW: 0x5dd6a0, NONE: 0x6fa8ff };

const app = document.getElementById("app")!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070b12);
scene.fog = new THREE.Fog(0x070b12, 900, 2400);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 1, 6000);
camera.position.set(620, 480, 620);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 60, 0);
controls.maxPolarAngle = Math.PI / 2.05;

// --- lighting: dusk sky + sun ---
scene.add(new THREE.HemisphereLight(0x9fc0ff, 0x0a0f18, 0.6));
const sun = new THREE.DirectionalLight(0xfff1d8, 1.4);
sun.position.set(-500, 700, 400);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 10; sun.shadow.camera.far = 2500;
(sun.shadow.camera as THREE.OrthographicCamera).left = -700;
(sun.shadow.camera as THREE.OrthographicCamera).right = 700;
(sun.shadow.camera as THREE.OrthographicCamera).top = 700;
(sun.shadow.camera as THREE.OrthographicCamera).bottom = -700;
scene.add(sun);

// --- ground ---
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(SITE.size * 2.4, SITE.size * 2.4),
  new THREE.MeshStandardMaterial({ color: 0x12161d, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);
const grid = new THREE.GridHelper(SITE.size * 2, 48, 0x1e2a3a, 0x141c28);
scene.add(grid);

// --- protected asset (plaza + marker) ---
const asset = new THREE.Mesh(
  new THREE.CylinderGeometry(SITE.protectedAsset.r, SITE.protectedAsset.r, 4, 48),
  new THREE.MeshStandardMaterial({ color: 0x16314a, emissive: 0x0a2740, roughness: 0.5 })
);
asset.position.y = 2; asset.receiveShadow = true; scene.add(asset);

// no-fly dome (wireframe)
const noFly = new THREE.Mesh(
  new THREE.SphereGeometry(SITE.noFlyR, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x2b4a6e, wireframe: true, transparent: true, opacity: 0.18 })
);
scene.add(noFly);

// --- city ---
const cityMat = new THREE.MeshStandardMaterial({ color: 0x2a3340, roughness: 0.85, metalness: 0.1 });
for (const b of buildings()) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), cityMat);
  m.position.set(b.x, b.h / 2, b.z);
  m.castShadow = true; m.receiveShadow = true;
  scene.add(m);
}

// --- sensors + coverage volumes ---
for (const s of sensors) {
  const post = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 16), new THREE.MeshStandardMaterial({ color: 0x3da3ff }));
  post.position.set(s.x, 8, s.z); scene.add(post);
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(s.rangeM, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.4),
    new THREE.MeshBasicMaterial({ color: s.modality === "radar" ? 0x2f6fb0 : s.modality === "rf" ? 0x8a5cff : 0x37b6a0, wireframe: true, transparent: true, opacity: 0.06 })
  );
  dome.position.set(s.x, 0, s.z); scene.add(dome);
}

// --- drones ---
interface Live { track: DroneTrack; group: THREE.Group; body: THREE.Mesh; trail: THREE.Line; cls: Classification; t: number; }
const live: Live[] = [];
const rotorSpin: THREE.Object3D[] = [];

function makeDrone(color: number): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(6, 2, 6), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4, roughness: 0.4 }));
  body.castShadow = true; body.name = "body"; g.add(body);
  for (const [dx, dz] of [[5,5],[5,-5],[-5,5],[-5,-5]] as const) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1, 0.6, 1), new THREE.MeshStandardMaterial({ color: 0x222831 }));
    arm.position.set(dx, 0, dz); g.add(arm);
    const rotor = new THREE.Mesh(new THREE.CircleGeometry(3.2, 12), new THREE.MeshBasicMaterial({ color: 0x9fb6d6, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
    rotor.rotation.x = -Math.PI / 2; rotor.position.set(dx, 1.4, dz); g.add(rotor); rotorSpin.push(rotor);
  }
  return g;
}

for (const t of tracks()) {
  const cls = classify(t.features);
  const color = THREAT_COLOR[cls.threat];
  const group = makeDrone(color);
  scene.add(group);
  const body = group.getObjectByName("body") as THREE.Mesh;
  const trailGeo = new THREE.BufferGeometry().setFromPoints(t.path.map((p: Waypoint) => new THREE.Vector3(p.x, p.y, p.z)));
  const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 }));
  scene.add(trail);
  live.push({ track: t, group, body, trail, cls, t: Math.random() });
}

// --- catmull-rom path eval for smooth flight ---
function pathPoint(path: Waypoint[], t: number): THREE.Vector3 {
  const curve = new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(p.x, p.y, p.z)), true, "catmullrom", 0.5);
  return curve.getPoint(t % 1);
}

// --- interaction: click a drone -> threat-call panel ---
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const panel = document.getElementById("panel")!;
addEventListener("click", (e) => {
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  const hit = ray.intersectObjects(live.map((l) => l.body), false)[0];
  if (!hit) { panel.classList.remove("show"); return; }
  const l = live.find((x) => x.body === hit.object)!;
  showPanel(l.track.id, l.cls);
});

function showPanel(id: string, k: Classification) {
  const cls = `threat-${k.threat}`;
  panel.innerHTML =
    `<span class="tag ${cls}">${k.threat}</span> <span style="font-size:11px;color:#7e97bd;margin-left:6px;">TRACK ${id}</span>` +
    `<h2>${k.class.toUpperCase()} · score ${k.score}</h2>` +
    `<div class="why">${explainTemplate(k)}</div>` +
    k.contributions.map((c) => `<div class="row"><span>${c.feature}</span><span>${c.weight > 0 ? "+" : ""}${c.weight}</span></div>`).join("") +
    `<div class="row" style="margin-top:10px;color:#5f7799;"><span>recommend-only · human-gated</span><span>LLM off kill-chain</span></div>`;
  panel.classList.add("show");
}

// --- loop ---
const clock = new THREE.Clock();
const clockEl = document.getElementById("clock")!;
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  for (const l of live) {
    const len = 1400; // approx path length scale
    l.t += (l.track.speedMps * dt) / len;
    const p = pathPoint(l.track.path, l.t);
    const ahead = pathPoint(l.track.path, l.t + 0.01);
    l.group.position.copy(p);
    l.group.lookAt(ahead);
  }
  for (const r of rotorSpin) r.rotation.z += dt * 40;
  controls.update();
  clockEl.textContent = `T+${clock.elapsedTime.toFixed(1)}s · ${live.length} tracks · ${live.filter((l) => l.cls.threat === "HIGH").length} HIGH`;
  renderer.render(scene, camera);
}
animate();

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
