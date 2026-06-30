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
import { buildings, sensors, tracks, SITE, type DroneTrack, type SensorSite } from "./data/scenario.js";
import { classify, explainTemplate, type Classification } from "./model/threatCall.js";
import { fetchNarration } from "./narrate.js";

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

// --- sensors: distinct coverage per modality + animated scan + live detection lines ---
// radar = 360° dome with a rotating sweep sector; rf = a bearing wedge that oscillates
// (DF antenna); eoir = a narrow camera frustum cone that pans. Each sensor "sees" a track
// only when the track is in range AND inside the modality's current scan lobe — so detection
// lines pop on as a beam crosses a drone, showing live sensor↔track association.
const MOD_COLOR = { radar: 0x2f6fb0, rf: 0x8a5cff, eoir: 0x37b6a0 } as const;
interface LiveSensor {
  site: SensorSite; yaw: THREE.Group; mode: "radar" | "rf" | "eoir";
  bearing: number; sweepDir: number; halfAngle: number; sweepSpan: number; spin: number;
}
const liveSensors: LiveSensor[] = [];

for (const s of sensors) {
  const col = MOD_COLOR[s.modality];
  const post = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 16), new THREE.MeshStandardMaterial({ color: col }));
  post.position.set(s.x, 8, s.z); scene.add(post);

  const grp = new THREE.Group(); grp.position.set(s.x, 0, s.z); scene.add(grp);
  const yaw = new THREE.Group(); grp.add(yaw);

  let halfAngle: number, sweepSpan: number, spin: number;
  if (s.modality === "radar") {
    halfAngle = 0.6; sweepSpan = 0; spin = 0.9;            // continuous 360° rotation
    // faint full-range coverage dome
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(s.rangeM, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.4),
      new THREE.MeshBasicMaterial({ color: col, wireframe: true, transparent: true, opacity: 0.05 })
    );
    grp.add(dome);
    // rotating sweep sector painted on the ground
    const sweep = new THREE.Mesh(
      new THREE.CircleGeometry(s.rangeM, 40, -0.18, 0.36),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false })
    );
    sweep.rotation.x = -Math.PI / 2; sweep.position.y = 5; yaw.add(sweep);
  } else if (s.modality === "rf") {
    halfAngle = 0.34; sweepSpan = 1.5; spin = 0;           // DF antenna oscillates its bearing
    const wedge = new THREE.Mesh(
      new THREE.CircleGeometry(s.rangeM, 32, -halfAngle, halfAngle * 2),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.10, side: THREE.DoubleSide, depthWrite: false })
    );
    wedge.rotation.x = -Math.PI / 2; wedge.position.y = 4; yaw.add(wedge);
  } else {
    halfAngle = 0.2; sweepSpan = 1.2; spin = 0;            // EO/IR camera pans a narrow frustum
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(s.rangeM * Math.tan(halfAngle), s.rangeM, 20, 1, true),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false })
    );
    // cone axis is +Y (apex at top); lay it on its side so the apex sits at the sensor and the
    // FOV opens outward along the yaw group's +X (the beam direction we test against below).
    cone.rotation.z = Math.PI / 2; cone.position.set(s.rangeM / 2, 22, 0); yaw.add(cone);
  }
  liveSensors.push({ site: s, yaw, mode: s.modality, bearing: 0, sweepDir: 1, halfAngle, sweepSpan, spin });
}

// --- drones ---
interface Live {
  track: DroneTrack; group: THREE.Group; frame: THREE.Group; body: THREE.Mesh;
  rotors: THREE.Object3D[]; strobe: THREE.MeshStandardMaterial; trail: THREE.Line;
  cls: Classification; t: number; bank: number; prevDir: THREE.Vector3;
  curve: THREE.CatmullRomCurve3; curveLen: number; climb: number;
  label: THREE.Sprite; ring?: THREE.Mesh;
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

/** Floating canvas-sprite label (id · class · threat), tinted by threat color. Built once per track. */
function makeLabel(text: string, color: number): THREE.Sprite {
  const pad = 14, fs = 30, h = 46;
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d")!;
  const font = `bold ${fs}px ui-sans-serif, system-ui, "Segoe UI", sans-serif`;
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  c.width = w; c.height = h;
  ctx.font = font; ctx.textBaseline = "middle";
  const hex = "#" + (color & 0xffffff).toString(16).padStart(6, "0");
  const r = 11, x0 = 1.5, y0 = 1.5, x1 = w - 1.5, y1 = h - 1.5;   // rounded pill outline
  ctx.beginPath(); ctx.moveTo(x0 + r, y0);
  ctx.arcTo(x1, y0, x1, y1, r); ctx.arcTo(x1, y1, x0, y1, r);
  ctx.arcTo(x0, y1, x0, y0, r); ctx.arcTo(x0, y0, x1, y0, r);
  ctx.closePath();
  ctx.fillStyle = "rgba(8,12,20,0.82)"; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = hex; ctx.stroke();
  ctx.fillStyle = hex; ctx.fillText(text, pad, h / 2 + 1);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
  sp.scale.set(w * 0.3, h * 0.3, 1);
  sp.renderOrder = 999;
  return sp;
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
  // per-track floating label + (for HIGH tracks) a pulsing ground ring
  const label = makeLabel(`${t.id} · ${cls.class.toUpperCase()} · ${cls.threat}`, color);
  scene.add(label);
  let ring: THREE.Mesh | undefined;
  if (cls.threat === "HIGH") {
    ring = new THREE.Mesh(
      new THREE.RingGeometry(9, 13, 48),
      new THREE.MeshBasicMaterial({ color: THREAT_COLOR.HIGH, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2; ring.position.y = 2; scene.add(ring);
  }
  live.push({ track: t, ...parts, trail, cls, t: Math.random(), bank: 0, prevDir: new THREE.Vector3(0, 0, 1), curve, curveLen, climb: 0, label, ring });
}

// --- live detection lines: one per (sensor, track); shown only while that sensor sees the track ---
interface DetLine { line: THREE.Line; s: LiveSensor; l: Live; pos: Float32Array; }
const detLines: DetLine[] = [];
for (const s of liveSensors) for (const l of live) {
  const pos = new Float32Array(6);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: MOD_COLOR[s.mode], transparent: true, opacity: 0.45 }));
  line.visible = false; line.frustumCulled = false; scene.add(line);
  detLines.push({ line, s, l, pos });
}

// --- interaction: click a drone -> threat-call panel ---
const ray = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const panel = document.getElementById("panel")!;

// leader-line overlay: a dashed line + ring connecting the selected track to the panel
const SVGNS = "http://www.w3.org/2000/svg";
const overlay = document.createElementNS(SVGNS, "svg");
overlay.setAttribute("style", "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9;");
const leader = document.createElementNS(SVGNS, "line");
leader.setAttribute("stroke-width", "1.5"); leader.setAttribute("stroke-dasharray", "5 4");
const leaderDot = document.createElementNS(SVGNS, "circle");
leaderDot.setAttribute("r", "5"); leaderDot.setAttribute("fill", "none"); leaderDot.setAttribute("stroke-width", "1.5");
overlay.append(leader, leaderDot);
overlay.style.display = "none";
document.body.appendChild(overlay);
let selected: Live | null = null;

addEventListener("click", (e) => {
  mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(mouse, camera);
  const hit = ray.intersectObjects(live.map((l) => l.body), false)[0];
  if (!hit) { panel.classList.remove("show"); selected = null; overlay.style.display = "none"; return; }
  const l = live.find((x) => x.body === hit.object)!;
  selected = l;
  const hex = "#" + (THREAT_COLOR[l.cls.threat] & 0xffffff).toString(16).padStart(6, "0");
  leader.setAttribute("stroke", hex); leaderDot.setAttribute("stroke", hex);
  showPanel(l);
});

// Monotonic token so a slow Bedrock reply for an old click can't overwrite a newer selection.
let narrateToken = 0;

function showPanel(l: Live) {
  const id = l.track.id, k = l.cls;
  const cls = `threat-${k.threat}`;
  panel.innerHTML =
    `<span class="tag ${cls}">${k.threat}</span> <span style="font-size:11px;color:#7e97bd;margin-left:6px;">TRACK ${id}</span>` +
    `<h2>${k.class.toUpperCase()} · score ${k.score}</h2>` +
    `<div class="why" id="why"><span class="src" id="src">⏳ AI narrating…</span>${explainTemplate(k)}</div>` +
    k.contributions.map((c) => `<div class="row"><span>${c.feature}</span><span>${c.weight > 0 ? "+" : ""}${c.weight}</span></div>`).join("") +
    `<div class="row" style="margin-top:10px;color:#5f7799;"><span>recommend-only · human-gated</span><span>LLM off kill-chain</span></div>`;
  panel.classList.add("show");

  // Narrate OFF the kill chain: Bedrock (Nova) when creds/bridge are live, else offline template.
  // The classification above is already drawn and never changes; only the prose is replaced.
  const token = ++narrateToken;
  void fetchNarration(l.track.features, k).then((n) => {
    if (token !== narrateToken) return;               // a newer click won
    const why = document.getElementById("why");
    if (!why) return;
    const badge = n.source === "bedrock"
      ? `<span class="src src-ai">◆ Bedrock Nova</span>`
      : `<span class="src src-off">○ offline template</span>`;
    why.innerHTML = `${badge}${n.text}`;
  });
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
    // floating label rides above the drone; HIGH tracks get a pulsing ground ring
    l.label.position.set(p.x, p.y + 15, p.z);
    if (l.ring) {
      const pulse = (Math.sin(clock.elapsedTime * 4) + 1) / 2;
      l.ring.position.set(p.x, 2, p.z);
      l.ring.scale.setScalar(1 + pulse * 0.7);
      (l.ring.material as THREE.MeshBasicMaterial).opacity = 0.2 + pulse * 0.5;
    }
  }
  // advance each sensor's scan (radar spins 360°; rf/eoir oscillate over their sweepSpan)
  for (const s of liveSensors) {
    if (s.spin) s.bearing = (s.bearing + dt * s.spin) % (Math.PI * 2);
    else {
      s.bearing += s.sweepDir * dt * 0.5;
      if (s.bearing > s.sweepSpan) { s.bearing = s.sweepSpan; s.sweepDir = -1; }
      else if (s.bearing < -s.sweepSpan) { s.bearing = -s.sweepSpan; s.sweepDir = 1; }
    }
    s.yaw.rotation.y = s.bearing;
  }
  // detection lines: a sensor sees a track when it's in range AND inside the current scan lobe
  for (const d of detLines) {
    const tp = d.l.group.position;
    const dx = tp.x - d.s.site.x, dz = tp.z - d.s.site.z;
    const range = Math.hypot(dx, dz);
    let seen = range <= d.s.site.rangeM;
    if (seen) {
      const dot = (dx * Math.cos(d.s.bearing) + dz * -Math.sin(d.s.bearing)) / (range || 1);
      seen = Math.acos(THREE.MathUtils.clamp(dot, -1, 1)) <= d.s.halfAngle;
    }
    d.line.visible = seen;
    if (seen) {
      d.pos[0] = d.s.site.x; d.pos[1] = 9; d.pos[2] = d.s.site.z;
      d.pos[3] = tp.x; d.pos[4] = tp.y; d.pos[5] = tp.z;
      (d.line.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }
  }
  // leader line: project the selected track to screen and connect it to the open panel
  if (selected && panel.classList.contains("show")) {
    const v = selected.group.position.clone(); v.y += 10; v.project(camera);
    if (v.z < 1) {
      const sx = (v.x * 0.5 + 0.5) * innerWidth, sy = (-v.y * 0.5 + 0.5) * innerHeight;
      const rect = panel.getBoundingClientRect();
      leader.setAttribute("x1", sx.toFixed(1)); leader.setAttribute("y1", sy.toFixed(1));
      leader.setAttribute("x2", rect.left.toFixed(1)); leader.setAttribute("y2", (rect.top + 26).toFixed(1));
      leaderDot.setAttribute("cx", sx.toFixed(1)); leaderDot.setAttribute("cy", sy.toFixed(1));
      overlay.style.display = "";
    } else { overlay.style.display = "none"; }
  } else { overlay.style.display = "none"; }
  controls.update();
  clockEl.textContent = `T+${clock.elapsedTime.toFixed(1)}s · ${live.length} tracks · ${live.filter((l) => l.cls.threat === "HIGH").length} HIGH`;
  renderer.render(scene, camera);
}
animate();

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
