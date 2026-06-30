// Overlay drawn on top of the 3D viewport: mission clock, scenario selector,
// playback transport, and the colour legend.
import { useStore } from "../state/store";
import { COLOR } from "../theme";

export function Overlay() {
  const t = useStore((s) => s.t);
  const tracks = useStore((s) => s.tracks);
  const running = useStore((s) => s.running);
  const speed = useStore((s) => s.speed);
  const scenario = useStore((s) => s.scenario);
  const setRunning = useStore((s) => s.setRunning);
  const setSpeed = useStore((s) => s.setSpeed);
  const setScenario = useStore((s) => s.setScenario);
  const reset = useStore((s) => s.reset);

  const live = tracks.filter((tr) => tr.alive && t >= tr.spawnT);
  const threats = live.filter((tr) => tr.affiliation === "noncoop");
  const critical = threats.filter((tr) => tr.gate.classification === "CRITICAL").length;

  return (
    <>
      <div className="hud clk">
        T+<b>{t.toFixed(0)}</b>s · {threats.length} threat / {live.length - threats.length} coop ·{" "}
        <span style={{ color: critical ? COLOR.crit : COLOR.faint }}>{critical} critical</span>
      </div>

      <div className="hud legend">
        <span><i style={{ background: COLOR.crit }} />Critical</span>
        <span><i style={{ background: COLOR.warn }} />Warning</span>
        <span><i style={{ background: COLOR.green }} />Clear</span>
        <span><i style={{ background: COLOR.sky }} />Cooperative</span>
      </div>

      <div className="transport">
        <div className="seg">
          <button className={scenario === "single" ? "on" : ""} onClick={() => setScenario("single")}>Single</button>
          <button className={scenario === "swarm" ? "on" : ""} onClick={() => setScenario("swarm")}>Swarm</button>
        </div>
        <div className="seg">
          {[1, 2, 4].map((s) => (
            <button key={s} className={speed === s ? "on" : ""} onClick={() => setSpeed(s)}>{s}×</button>
          ))}
        </div>
        <button onClick={reset}>Reset</button>
        <button className="primary" onClick={() => setRunning(!running)}>
          {running ? "❚❚ Pause" : "▶ Run"}
        </button>
      </div>
    </>
  );
}
