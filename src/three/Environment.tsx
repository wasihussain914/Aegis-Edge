// The static battlespace: ground, AO grid, FOB structures, and the layered
// defense rings (detection / warning / critical) drawn as ground circles + a
// translucent sensor-coverage dome.
import { Grid } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { AO_HALF_M, SCALE } from "../sim/geo";
import { CPA_CRITICAL, CPA_WARNING } from "../sim/gate";
import { COLOR } from "../theme";

function ringGeometry(radiusM: number, segments = 128): THREE.BufferGeometry {
  const r = radiusM * SCALE;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * r, 0.02, Math.sin(a) * r));
  }
  return new THREE.BufferGeometry().setFromPoints(pts);
}

function DefenseRing({ radiusM, color }: { radiusM: number; color: string }) {
  const geo = useMemo(() => ringGeometry(radiusM), [radiusM]);
  return (
    <line>
      <primitive object={geo} attach="geometry" />
      <lineBasicMaterial color={color} transparent opacity={0.5} />
    </line>
  );
}

function Fob() {
  // A compact cluster of structures at the FOB centre (origin).
  const blocks = useMemo(
    () => [
      { p: [0, 0, 0], s: [80, 28, 50] },
      { p: [120, 0, 40], s: [50, 18, 40] },
      { p: [-110, 0, -30], s: [40, 22, 60] },
      { p: [20, 0, -130], s: [70, 14, 30] },
    ],
    [],
  );
  return (
    <group>
      {blocks.map((b, i) => (
        <mesh key={i} position={[b.p[0] * SCALE, (b.s[1] * SCALE) / 2, b.p[2] * SCALE]} castShadow>
          <boxGeometry args={[b.s[0] * SCALE, b.s[1] * SCALE, b.s[2] * SCALE]} />
          <meshStandardMaterial color="#2a3850" roughness={0.9} />
        </mesh>
      ))}
      {/* FOB marker beacon */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 1.2, 8]} />
        <meshBasicMaterial color={COLOR.bronze} />
      </mesh>
    </group>
  );
}

export function Environment() {
  return (
    <group>
      {/* ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[AO_HALF_M * 2 * SCALE * 1.4, AO_HALF_M * 2 * SCALE * 1.4]} />
        <meshStandardMaterial color="#0b1018" roughness={1} metalness={0} />
      </mesh>

      <Grid
        args={[AO_HALF_M * 2 * SCALE, AO_HALF_M * 2 * SCALE]}
        cellSize={1}
        cellThickness={0.5}
        cellColor={COLOR.line}
        sectionSize={5}
        sectionThickness={1}
        sectionColor={COLOR.line2}
        fadeDistance={60}
        fadeStrength={1}
        infiniteGrid={false}
        position={[0, 0.01, 0]}
      />

      {/* layered defense / sensing rings */}
      <DefenseRing radiusM={AO_HALF_M} color={COLOR.sky} />
      <DefenseRing radiusM={CPA_WARNING * 3} color={COLOR.warn} />
      <DefenseRing radiusM={CPA_WARNING} color={COLOR.warn} />
      <DefenseRing radiusM={CPA_CRITICAL} color={COLOR.crit} />

      {/* sensor-coverage dome over the FOB (RF / radar hemisphere) */}
      <mesh>
        <sphereGeometry args={[AO_HALF_M * SCALE, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color={COLOR.sky} transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>

      <Fob />
    </group>
  );
}
