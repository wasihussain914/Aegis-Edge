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
import { buildings, sensors, tracks, SITE, type DroneTrack } from "./data/scenario.js";
import { classify, explainTemplate, type Classification } from "./model/threatCall.js";

const THREAT_COLOR: Record<string, number> = { HIGH: 0xff4d5e, MED: 0xffc14d, LOW: 0x5dd6a0, NONE: 0x6fa8ff };

const app = document.getElementById("app")!;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1320);
scene.fog = new THREE.Fog(0x142031, 900, 2600);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 1, 6000);
camera.position.set(620, 480, 620);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 60, 0);
controls.maxPolarAngle = Math.PI / 2.05;

// --- atmospheric dusk sky dome (gradient: warm horizon -> deep blue zenith) ---
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(3400, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, fog: false, depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(0x081225) },
      mid: { value: new THREE.Color(0x223a5c) },
      bot: { value: new THREE.Color(0xc77a44) },
    },
    vertexShader: "varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader:
      "varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bot;" +
      "void main(){ float h = normalize(vP).y;" +
      " vec3 c = mix(bot, mid, smoothstep(-0.04, 0.28, h));" +
      " c = mix(c, top, smoothstep(0.22, 0.72, h));" +
      " gl_FragColor = vec4(c, 1.0); }",
  })
);
scene.add(sky);

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

// --- procedural ground texture: subtle terrain speckle so it doesn't read as flat color ---
function makeGroundTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#0d121a"; g.fillRect(0, 0, 256, 256);
  let s = 1337; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = `rgba(120,142,172,${0.03 + rnd() * 0.06})`;
    g.fillRect(rnd() * 256, rnd() * 256, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(28, 28);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// --- ground ---
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(SITE.size * 2.4, SITE.size * 2.4),
  new THREE.MeshStandardMaterial({ color: 0x161b24, roughness: 1, map: makeGroundTexture() })
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

// --- city: dusk facades with lit windows + varied rooftops ---
// Emissive window map: black facade, a deterministic scatter of warm/cool lit windows.
function makeWindowsTexture(seed: number): THREE.CanvasTexture {
  const c = document.createElement("canvas"); c.width = 64; c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000"; g.fillRect(0, 0, 64, 128);
  let s = (seed >>> 0) || 1; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const cols = 6, rows = 12, cw = 64 / cols, ch = 128 / rows;
  for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++) {
    if (rnd() < 0.5) {
      g.fillStyle = rnd() < 0.72 ? "#ffcf8a" : "#bcdcff";
      g.fillRect(col * cw + 1.5, r * ch + 2, cw - 3, ch - 4);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const windowVariants = Array.from({ length: 6 }, (_, i) => makeWindowsTexture(0x51c7 + i * 977));
const facadeTones = [0x222b38, 0x2a3340, 0x1d2530, 0x2f3744, 0x252e3b];
const roofMat = new THREE.MeshStandardMaterial({ color: 0x141a22, roughness: 0.9, metalness: 0.15 });
const parapetMat = new THREE.MeshStandardMaterial({ color: 0x2b3340, roughness: 0.85 });

const cityBuildings = buildings();
// Footprint boxes (+margin) and rooftop height used by the drones for altitude avoidance.
const cityBoxes = cityBuildings.map((b) => ({
  x: b.x, z: b.z, hw: b.w / 2 + 10, hd: b.d / 2 + 10, top: b.h + 14,
}));
/** Min altitude a drone should hold at (x,z) to clear any rooftop it's flying over. */
function clearanceFloor(x: number, z: number): number {
  let floor = 0;
  for (const b of cityBoxes) {
    if (Math.abs(x - b.x) < b.hw && Math.abs(z - b.z) < b.hd && b.top + 16 > floor) {
      floor = b.top + 16; // rooftop + safety standoff
    }
  }
  return floor;
}

for (const b of cityBuildings) {
  // per-building deterministic variety from its position
  let s = ((Math.round(b.x) * 73856093) ^ (Math.round(b.z) * 19349663)) >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };

  const g = new THREE.Group();
  const winTex = windowVariants[Math.floor(rnd() * windowVariants.length)].clone();
  winTex.needsUpdate = true;
  winTex.repeat.set(Math.max(1, Math.round(b.w / 13)), Math.max(2, Math.round(b.h / 13)));
  const facadeMat = new THREE.MeshStandardMaterial({
    color: facadeTones[Math.floor(rnd() * facadeTones.length)], roughness: 0.82, metalness: 0.12,
    emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 0.9,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), facadeMat);
  body.position.y = b.h / 2; body.castShadow = true; body.receiveShadow = true; g.add(body);

  // roof slab + parapet rim so the tops aren't open boxes
  const roof = new THREE.Mesh(new THREE.BoxGeometry(b.w, 1.5, b.d), roofMat);
  roof.position.y = b.h + 0.75; roof.castShadow = true; g.add(roof);
  const parapet = new THREE.Mesh(new THREE.BoxGeometry(b.w + 1.5, 3, b.d + 1.5), parapetMat);
  parapet.position.y = b.h + 1.5; g.add(parapet);
  const inner = new THREE.Mesh(new THREE.BoxGeometry(b.w - 3, 3.2, b.d - 3), roofMat);
  inner.position.y = b.h + 1.6; g.add(inner); // recess inside the parapet

  // varied rooftop equipment
  const kind = rnd();
  if (kind < 0.4) { // HVAC blocks
    const n = 1 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) {
      const u = new THREE.Mesh(new THREE.BoxGeometry(4 + rnd() * 6, 3 + rnd() * 4, 4 + rnd() * 6), parapetMat);
      u.position.set((rnd() - 0.5) * b.w * 0.5, b.h + 4, (rnd() - 0.5) * b.d * 0.5); u.castShadow = true; g.add(u);
    }
  } else if (kind < 0.7) { // water tank
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 7, 12), parapetMat);
    tank.position.set((rnd() - 0.5) * b.w * 0.4, b.h + 5, (rnd() - 0.5) * b.d * 0.4); tank.castShadow = true; g.add(tank);
  } else if (kind < 0.88) { // comms mast with a red obstruction light
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 14, 6), roofMat);
    mast.position.set((rnd() - 0.5) * b.w * 0.3, b.h + 7, (rnd() - 0.5) * b.d * 0.3); g.add(mast);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xff3b3b, emissive: 0xff3b3b, emissiveIntensity: 2 }));
    beacon.position.set(mast.position.x, b.h + 14, mast.position.z); g.add(beacon);
  }
  g.position.set(b.x, 0, b.z);
  scene.add(g);
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
interface Live {
  track: DroneTrack; group: THREE.Group; frame: THREE.Group; body: THREE.Mesh;
  rotors: THREE.Object3D[]; strobe: THREE.MeshStandardMaterial; trail: THREE.Line;
  cls: Classification; t: number; bank: number; prevDir: THREE.Vector3;
  curve: THREE.CatmullRomCurve3; curveLen: number; climb: number;
}
const live: Live[] = [];

interface DroneParts { group: THREE.Group; frame: THREE.Group; body: THREE.Mesh; rotors: THREE.Object3D[]; strobe: THREE.MeshStandardMaterial; }

/** A proper quadrotor: capsule hull, carbon X-frame + motor pods, blurred contra-rotors,
 *  camera gimbal, and red/green nav lights + a blinking tail strobe. */
function makeDrone(color: number): DroneParts {
  const group = new THREE.Group();         // positioned + yawed (lookAt) each frame
  const frame = new THREE.Group();         // airframe; gets banked (rolled) into turns
  group.add(frame);
  const rotors: THREE.Object3D[] = [];
  const carbon = new THREE.MeshStandardMaterial({ color: 0x161b24, roughness: 0.55, metalness: 0.35 });
  const span = 6;

  // hull (long axis forward = +Z) — replaces the flat box body
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(2.4, 4.2, 4, 12),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.4, metalness: 0.2 })
  );
  body.rotation.x = Math.PI / 2; body.castShadow = true; body.name = "body";
  frame.add(body);

  // camera gimbal slung under the nose
  const gimbal = new THREE.Mesh(new THREE.SphereGeometry(1.3, 12, 10), new THREE.MeshStandardMaterial({ color: 0x07090d, roughness: 0.3, metalness: 0.6 }));
  gimbal.position.set(0, -2.2, 2.6); frame.add(gimbal);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.75, 1.2, 10), new THREE.MeshStandardMaterial({ color: 0x0e1622, emissive: 0x1f3e5c, emissiveIntensity: 0.6 }));
  lens.rotation.x = Math.PI / 2.6; lens.position.set(0, -2.7, 3.4); frame.add(lens);

  // four arms + motor pods + rotors
  for (const [dx, dz] of [[span, span], [span, -span], [-span, span], [-span, -span]] as const) {
    const L = Math.hypot(dx, dz);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(L, 0.7, 0.7), carbon);
    arm.position.set(dx / 2, 0, dz / 2); arm.rotation.y = Math.atan2(-dz, dx); arm.castShadow = true;
    frame.add(arm);
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 1.8, 10), carbon);
    pod.position.set(dx, 0.5, dz); frame.add(pod);

    const rotor = new THREE.Group();
    rotor.position.set(dx, 1.5, dz);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(4.2, 24), new THREE.MeshBasicMaterial({ color: 0x9fb6d6, transparent: true, opacity: 0.16, side: THREE.DoubleSide }));
    disc.rotation.x = -Math.PI / 2; rotor.add(disc);                       // motion-blur disc
    for (const ang of [0, Math.PI / 2]) {                                  // two thin blades
      const blade = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.18, 0.55), new THREE.MeshStandardMaterial({ color: 0x2a2f3a }));
      blade.rotation.y = ang; rotor.add(blade);
    }
    frame.add(rotor); rotors.push(rotor);
  }

  // nav lights: port red, starboard green, blinking white tail strobe
  const navMat = (c: number) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.5 });
  const port = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), navMat(0xff2b2b)); port.position.set(-span, 0.7, 1.5); frame.add(port);
  const stbd = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), navMat(0x2bff6a)); stbd.position.set(span, 0.7, 1.5); frame.add(stbd);
  const strobe = navMat(0xffffff);
  const tail = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), strobe); tail.position.set(0, 0.9, -span); frame.add(tail);

  return { group, frame, body, rotors, strobe };
}

for (const t of tracks()) {
  const cls = classify(t.features);
  const color = THREAT_COLOR[cls.threat];
  const parts = makeDrone(color);
  scene.add(parts.group);
  // One curve per drone, built once (was rebuilt every frame). Arc-length lookups below
  // give constant ground speed and smooth heading along the spline.
  const curve = new THREE.CatmullRomCurve3(t.path.map((p) => new THREE.Vector3(p.x, p.y, p.z)), true, "catmullrom", 0.5);
  const curveLen = curve.getLength();
  // Trail follows the smooth flown spline (arc-length spaced) rather than the raw waypoints.
  const trailGeo = new THREE.BufferGeometry().setFromPoints(curve.getSpacedPoints(80));
  const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 }));
  scene.add(trail);
  live.push({ track: t, ...parts, trail, cls, t: Math.random(), bank: 0, prevDir: new THREE.Vector3(0, 0, 1), curve, curveLen, climb: 0 });
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
    // Arc-length lookups: u is fraction of distance, so ground speed is constant in m/s
    // regardless of how the spline bunches near waypoints (smooth, real-looking motion).
    const u = ((l.t % 1) + 1) % 1;
    const p = l.curve.getPointAt(u);
    const ahead = l.curve.getPointAt((u + 0.012) % 1);
    // Building avoidance: climb to clear any rooftop we're overflying, then ease back down.
    const need = Math.max(0, clearanceFloor(p.x, p.z) - p.y);
    l.climb += (need - l.climb) * Math.min(1, dt * 1.5);               // smooth climb/descend
    p.y += l.climb; ahead.y += l.climb;
    l.group.position.copy(p);
    l.group.lookAt(ahead);
    // bank into the turn: roll the airframe by the signed heading change
    const dir = ahead.clone().sub(p).setY(0).normalize();
    const turn = l.prevDir.x * dir.z - l.prevDir.z * dir.x;             // signed (cross-y)
    const targetBank = THREE.MathUtils.clamp(turn * 40, -0.6, 0.6);
    l.bank += (targetBank - l.bank) * Math.min(1, dt * 4);
    l.frame.rotation.z = l.bank;
    l.prevDir.copy(dir);
    // Speed easing: ease off the throttle through sharp turns, full speed on straights.
    const speedScale = 1 - Math.min(0.55, Math.abs(turn) * 9);
    l.t += (l.track.speedMps * speedScale * dt) / l.curveLen;
    for (const r of l.rotors) r.rotation.y += dt * 42;                  // spin rotors
    l.strobe.emissiveIntensity = Math.sin(clock.elapsedTime * 8 + l.t * 12) > 0.7 ? 3.2 : 0.12;
  }
  controls.update();
  clockEl.textContent = `T+${clock.elapsedTime.toFixed(1)}s · ${live.length} tracks · ${live.filter((l) => l.cls.threat === "HIGH").length} HIGH`;
  renderer.render(scene, camera);
}
animate();

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
