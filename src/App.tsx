import { Overlay } from "./hud/Overlay";
import { Rail } from "./hud/Rail";
import { useStore } from "./state/store";
import { Scene } from "./three/Scene";

export default function App() {
  const wcs = useStore((s) => s.wcs);
  const abort = useStore((s) => s.abort);
  return (
    <div className="app">
      <div className="topbar">
        <span className="brand">
          WOLF<b>BERG</b> <span className="x">×</span> PER ASPERA
        </span>
        <span className="subttl">C-UAS 3D OPERATOR CONSOLE · 1 km² FOB · CHALLENGE #8</span>
        <span className="spacer" />
        <span className="chip">WCS · {wcs}</span>
        <span className="chip">GovCloud IL5</span>
        <span className="chip">Edge · Greengrass v2</span>
        <button className="abort" onClick={abort}>■ ABORT → MANUAL</button>
      </div>

      <div className="stage">
        <div className="viewport">
          <Scene />
          <Overlay />
        </div>
        <Rail />
      </div>
    </div>
  );
}
