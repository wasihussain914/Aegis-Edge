// The 3D canvas: camera, lights, controls, the static battlespace, the live
// tracks, and the per-frame simulation tick.
import { OrbitControls, Stars } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useStore } from "../state/store";
import { COLOR } from "../theme";
import { Environment } from "./Environment";
import { Tracks } from "./Tracks";

function SimDriver() {
  const tick = useStore((s) => s.tick);
  useFrame((_, delta) => tick(delta));
  return null;
}

export function Scene() {
  const select = useStore((s) => s.select);
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [14, 12, 16], fov: 45, near: 0.1, far: 400 }}
      onPointerMissed={() => select(null)}
      style={{ background: "linear-gradient(180deg,#0a1422 0%,#070b12 100%)" }}
    >
      <SimDriver />
      <ambientLight intensity={0.45} />
      <directionalLight
        position={[20, 30, 12]}
        intensity={1.1}
        color={COLOR.paper}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <hemisphereLight args={[COLOR.sky, COLOR.ink2, 0.35]} />
      <Stars radius={120} depth={40} count={1200} factor={3} fade speed={0.4} />

      <Environment />
      <Tracks />

      <OrbitControls
        enablePan
        maxPolarAngle={Math.PI / 2.05}
        minDistance={4}
        maxDistance={90}
        target={[0, 1, 0]}
      />
    </Canvas>
  );
}
