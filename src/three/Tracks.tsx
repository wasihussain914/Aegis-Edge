// Renders every live track as a 3D entity: body geometry by kind, colour by gate
// classification, a fading trail, a forward predicted path (non-cooperative only),
// a vertical drop-line to its ground shadow, and a selat-distance label.
import { Billboard, Line, Text } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { SCALE, worldTuple } from "../sim/geo";
import type { Track } from "../sim/types";
import { useStore } from "../state/store";
import { COLOR, trackColor } from "../theme";

function Body({ tr, color }: { tr: Track; color: string }) {
  switch (tr.kind) {
    case "fixed-wing":
      return (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.18, 0.6, 4]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
        </mesh>
      );
    case "rotary":
      return (
        <mesh>
          <cylinderGeometry args={[0.22, 0.22, 0.12, 12]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
        </mesh>
      );
    default:
      // small-UAS / friendly-uas: quad-ish octahedron
      return (
        <mesh>
          <octahedronGeometry args={[0.22, 0]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
        </mesh>
      );
  }
}

function TrackEntity({ tr }: { tr: Track }) {
  const selectedId = useStore((s) => s.selectedId);
  const select = useStore((s) => s.select);
  const selected = selectedId === tr.id;
  const color = trackColor(tr);
  const [x, y, z] = worldTuple(tr.pos);

  const trailPts = useMemo<[number, number, number][]>(
    () => tr.trail.map((p) => worldTuple(p)),
    [tr.trail],
  );
  const predPts = useMemo<[number, number, number][]>(
    () => tr.predicted.map((p) => worldTuple(p)),
    [tr.predicted],
  );

  return (
    <group>
      {/* trail */}
      {trailPts.length > 1 && (
        <Line points={trailPts} color={color} lineWidth={selected ? 2 : 1} transparent opacity={0.5} />
      )}
      {/* predicted path */}
      {predPts.length > 1 && (
        <Line points={[[x, y, z], ...predPts]} color={color} lineWidth={1} dashed dashSize={0.12} gapSize={0.08} transparent opacity={0.8} />
      )}

      {/* drop line + ground shadow */}
      <Line points={[[x, y, z], [x, 0.02, z]]} color={color} lineWidth={1} transparent opacity={0.25} />
      <mesh position={[x, 0.02, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.12, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>

      {/* body */}
      <group position={[x, y, z]} onClick={(e) => { e.stopPropagation(); select(tr.id); }}>
        <Body tr={tr} color={color} />
        {selected && (
          <mesh>
            <sphereGeometry args={[0.42, 16, 16]} />
            <meshBasicMaterial color={COLOR.paper} wireframe transparent opacity={0.35} />
          </mesh>
        )}
        <Billboard position={[0, 0.5, 0]}>
          <Text
            fontSize={selected ? 0.34 : 0.26}
            color={selected ? COLOR.paper : color}
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.01}
            outlineColor={COLOR.ink2}
          >
            {tr.id}
          </Text>
        </Billboard>
      </group>
    </group>
  );
}

/** Soft flash where a defeated track resolved. */
function DefeatMark({ tr }: { tr: Track }) {
  const [x, y, z] = worldTuple(tr.pos);
  return (
    <mesh position={[x, y, z]}>
      <ringGeometry args={[0.2 * SCALE * 100, 0.5, 24]} />
      <meshBasicMaterial color={COLOR.crit} transparent opacity={0.5} side={THREE.DoubleSide} />
    </mesh>
  );
}

export function Tracks() {
  const tracks = useStore((s) => s.tracks);
  const t = useStore((s) => s.t);
  return (
    <group>
      {tracks.map((tr) => {
        if (tr.defeated) {
          if (tr.defeatT !== undefined && t - tr.defeatT < 0.8) return <DefeatMark key={tr.id} tr={tr} />;
          return null;
        }
        if (t < tr.spawnT) return null;
        return <TrackEntity key={tr.id} tr={tr} />;
      })}
    </group>
  );
}
