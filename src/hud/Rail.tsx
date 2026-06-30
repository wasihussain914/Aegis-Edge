// The operator rail: priority track list, Weapons Control Status, threat
// assessment + engagement decision, live FP metrics, and the governance ledger.
import { useMemo } from "react";
import { CPA_CRITICAL, CPA_WARNING, wcsNote } from "../sim/gate";
import { GENESIS } from "../sim/ledger";
import { WCS_LEVELS } from "../sim/types";
import { useStore } from "../state/store";
import { COLOR, classColor, priorityScore, trackColor } from "../theme";

function fmtM(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

function TrackList() {
  const tracks = useStore((s) => s.tracks);
  const t = useStore((s) => s.t);
  const selectedId = useStore((s) => s.selectedId);
  const select = useStore((s) => s.select);

  const ordered = useMemo(() => {
    return tracks
      .filter((tr) => tr.alive && t >= tr.spawnT && tr.affiliation === "noncoop")
      .sort((a, b) => priorityScore(b) - priorityScore(a));
  }, [tracks, t]);

  const coop = tracks.filter((tr) => tr.affiliation === "coop" && tr.alive);

  return (
    <div className="card">
      <h2>Tracks · priority order</h2>
      <div className="tlist">
        {ordered.length === 0 && <div className="empty">No threat tracks in volume.</div>}
        {ordered.map((tr) => (
          <button
            key={tr.id}
            className={`titem${selectedId === tr.id ? " sel" : ""}`}
            onClick={() => select(tr.id)}
          >
            <span className="tag" style={{ background: trackColor(tr) }} />
            <span>
              <div className="ti">{tr.id}</div>
              <div className="tx">{tr.gate.classification} · {tr.gate.recommendedAction}</div>
            </span>
            <span className="rt">
              {fmtM(tr.rangeM)}
              <br />
              {tr.closing ? `${Math.round(tr.timeToCpaS)}s to CPA` : "outbound"}
            </span>
          </button>
        ))}
        {coop.map((tr) => (
          <button
            key={tr.id}
            className={`titem${selectedId === tr.id ? " sel" : ""}`}
            onClick={() => select(tr.id)}
          >
            <span className="tag" style={{ background: COLOR.sky }} />
            <span>
              <div className="ti">{tr.id}</div>
              <div className="tx">COOPERATIVE · {tr.role}</div>
            </span>
            <span className="rt">{fmtM(tr.rangeM)}<br />ADS-B / RID</span>
          </button>
        ))}
      </div>
      <div className="legend2">
        <span><i style={{ background: COLOR.crit }} />Critical</span>
        <span><i style={{ background: COLOR.warn }} />Warning</span>
        <span><i style={{ background: COLOR.green }} />Clear</span>
        <span><i style={{ background: COLOR.sky }} />Cooperative</span>
      </div>
    </div>
  );
}

function WcsControl() {
  const wcs = useStore((s) => s.wcs);
  const setWcs = useStore((s) => s.setWcs);
  const armAuto = useStore((s) => s.armAuto);
  const autoArmed = useStore((s) => s.autoArmed);
  return (
    <div className="card">
      <h2>Weapons Control Status</h2>
      <div className="wcs">
        {WCS_LEVELS.map((w) => (
          <b
            key={w}
            className={wcs === w ? "on" : ""}
            onClick={() => (w === "AUTO" ? armAuto() : setWcs(w))}
          >
            {w}
          </b>
        ))}
      </div>
      <div className="wcsnote">
        {wcsNote(wcs)}
        {wcs === "AUTO" && (
          <> {autoArmed ? "· ARMED (two-person)." : "· arming requires a second authorizer."}</>
        )}
      </div>
    </div>
  );
}

function ThreatPanel() {
  const selectedId = useStore((s) => s.selectedId);
  const tracks = useStore((s) => s.tracks);
  const recommendId = useStore((s) => s.recommendId);
  const commitDefeat = useStore((s) => s.commitDefeat);
  const tr = tracks.find((x) => x.id === selectedId);

  if (!tr) {
    return (
      <div className="card">
        <h2>Threat assessment</h2>
        <div className="empty">Select a track to review its assessment and engagement decision.</div>
      </div>
    );
  }

  const g = tr.gate;
  const isCoop = tr.affiliation === "coop";
  const badgeColor = isCoop ? COLOR.sky : classColor(g.classification);

  return (
    <div className="card">
      <h2>Threat assessment · {tr.id}</h2>
      <span className="badge" style={{ background: badgeColor }}>{g.classification}</span>
      <div className="grid">
        <div><div className="k">Range to FOB</div><div className="v">{fmtM(tr.rangeM)}</div></div>
        <div><div className="k">Speed</div><div className="v">{tr.speed.toFixed(0)} m/s</div></div>
        <div><div className="k">Predicted CPA</div><div className="v">{fmtM(tr.cpaM)}</div></div>
        <div><div className="k">Time to CPA</div><div className="v">{tr.closing ? `${Math.round(tr.timeToCpaS)} s` : "—"}</div></div>
        <div><div className="k">Affiliation</div><div className="v" style={{ fontSize: 13 }}>{isCoop ? "COOPERATIVE" : "NON-COOP"}</div></div>
        <div><div className="k">P(maneuver)</div><div className="v" style={{ fontSize: 13 }}>{tr.pManeuver.toFixed(2)}</div></div>
      </div>
      <div className="rec" style={{ borderColor: badgeColor }}>
        <div className="lab">Gate · recommended action</div>
        <div className="val">{g.recommendedAction}</div>
      </div>

      {isCoop ? (
        <div className="deconf">
          Cooperative contact (ADS-B / Remote ID). Deterministically deconflicted to
          HOLD_FRIENDLY — the gate authorizes no effect against it regardless of kinematics.
        </div>
      ) : (
        <>
          <div className="acts">
            <button
              className="btn id"
              disabled={tr.positiveId === "hostile"}
              onClick={() => recommendId(tr.id, "hostile")}
            >
              {tr.positiveId === "hostile" ? "PID: HOSTILE" : "Declare hostile (PID)"}
            </button>
            <button
              className="btn commit"
              disabled={!g.effectAuthorized || tr.engaged}
              onClick={() => commitDefeat(tr.id)}
            >
              {tr.engaged ? "Defeat tasked" : g.requiresTwoPerson ? "Commit defeat (2-person)" : "Commit defeat"}
            </button>
          </div>
          <div className="guard">
            {g.effectAuthorized
              ? `Defeat ${g.recommendOnly ? "RECOMMENDED" : "AUTHORIZED"}. Non-kinetic (RF) first. Every commit is hash-chained.`
              : `Not engageable under ${useStore.getState().wcs}. ${
                  g.recommendedAction === "TRACK" ? "Track maintained; declare PID or raise WCS to authorize." : "Below threat threshold."
                }`}
          </div>
        </>
      )}
    </div>
  );
}

function Metrics() {
  const metrics = useStore((s) => s.metrics);
  const detRate = metrics.threatTracksSeen
    ? (metrics.threatTracksDetected / metrics.threatTracksSeen) * 100
    : 100;
  const fpRate = metrics.coopDecisions ? (metrics.falseEngagements / metrics.coopDecisions) * 100 : 0;
  return (
    <div className="card metrics">
      <h2>Detection & false-positive analysis</h2>
      <div className="big">{fpRate.toFixed(4)}%</div>
      <div className="hint">
        false engagements vs cooperative aircraft — {metrics.falseEngagements}/{metrics.coopDecisions} decisions.
        Spec target &lt; 0.1%.
      </div>
      <div className="row"><span className="k">Threat detection rate</span><span className="v">{detRate.toFixed(1)}% ({metrics.threatTracksDetected}/{metrics.threatTracksSeen})</span></div>
      <div className="row"><span className="k">Cooperative decisions</span><span className="v">{metrics.coopDecisions}</span></div>
      <div className="row"><span className="k">False engagements</span><span className="v">{metrics.falseEngagements}</span></div>
      <div className="row"><span className="k">Gate decision time</span><span className="v">&lt; 1 ms (deterministic)</span></div>
    </div>
  );
}

function Ledger() {
  const ledger = useStore((s) => s.ledger);
  const chainOk = useStore((s) => s.chainOk);
  const verify = useStore((s) => s.verify);
  const tip = ledger.length ? ledger[ledger.length - 1].hash : GENESIS;
  return (
    <div className="card ledger">
      <div className="lhead">
        <h2 style={{ margin: 0 }}>Governance ledger</h2>
        <button className="vchk" onClick={verify}>verify chain</button>
      </div>
      <div className="meta">
        entries <b>{ledger.length}</b> · tip <b>{tip}</b> · chain{" "}
        <b className={chainOk ? "ok" : "bad"}>{chainOk ? "VERIFIED" : "BROKEN"}</b>
      </div>
      <div className="lrows">
        {ledger.length === 0 && <div className="empty">No governed actions yet.</div>}
        {ledger.slice().reverse().map((e) => (
          <div className="lrow" key={e.seq}>
            <span style={{ color: COLOR.faint }}>T+{e.t.toFixed(0)}s</span>
            <span className={`out ${e.outcome}`}>{e.outcome}</span>
            <span className="act">{e.action}{e.trackId ? ` · ${e.trackId}` : ""}</span>
            <span className="hash">{e.hash}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Rail() {
  return (
    <div className="rail">
      <TrackList />
      <WcsControl />
      <ThreatPanel />
      <Metrics />
      <Ledger />
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: COLOR.faint, lineHeight: 1.6 }}>
        Thresholds: CPA critical &le; {CPA_CRITICAL} m · warning &le; {CPA_WARNING} m. Defeat is
        recommend-only unless AUTO armed. LLM assessment is off the kill chain.
      </div>
    </div>
  );
}
