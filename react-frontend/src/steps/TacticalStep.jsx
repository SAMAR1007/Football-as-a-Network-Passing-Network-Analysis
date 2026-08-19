import { useState, useEffect } from "react";
import { api } from "../api";
import { esc, n1, shape } from "../utils";
import HeatmapSVG from "../components/HeatmapSVG";
import SonarChart from "../components/SonarChart";
import StatGrid from "../components/StatGrid";

export default function TacticalStep({ match, teams }) {
  const [cmp, setCmp] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!match || teams.length === 0) return;
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const [c, d] = await Promise.all([
          api({ command: "compare", match_date: match }),
          Promise.all(
            teams.map((t) =>
              Promise.all([
                api({ command: "tactical_map", match_date: match, team: t }),
                api({ command: "insights", match_date: match, team: t }),
                api({ command: "zone_connections", match_date: match, team: t }),
                api({ command: "network", match_date: match, team: t }),
              ])
            )
          ),
        ]);
        if (!cancelled) {
          setCmp(c);
          setData(d);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [match, teams]);

  if (error) return <p className="loading">Error: {error}</p>;
  if (!data || !cmp) return <p className="loading">Computing...</p>;

  return (
    <>
      <div className="card">
        <h3>Tactical geography</h3>
        <p className="muted">
          Where each team plays and how hard it presses. PPDA: lower = more
          aggressive. Field tilt: share of all final-third passes. The 25-zone
          map colours by pass volume; the sonar shows passing direction (forward
          points up).
        </p>
      </div>
      <div className="cols">
        {teams.map((t, i) => {
          const [tm, ins, zc, net] = data[i];
          if (!tm) return null;
          const c = (cmp.teams || {})[t] || {};
          const ppda = c.ppda?.ppda;
          const tilt = c.field_tilt?.field_tilt;
          const sh = shape(net);
          const tot =
            zc.progressive_passes + zc.regressive_passes + zc.lateral_passes || 1;
          return (
            <div className="card" key={t}>
              <div className="teamhdr">
                <span
                  className="dot"
                  style={{
                    background:
                      t === teams[0] ? "#3b82f6" : "#ef4444",
                  }}
                ></span>
                {esc(t)}
              </div>
              <StatGrid
                stats={[
                  {
                    label: "PPDA",
                    value: ppda == null ? "-" : n1(ppda),
                  },
                  {
                    label: "Field tilt",
                    value: tilt == null ? "-" : tilt.toFixed(0) + "%",
                  },
                  {
                    label: "Progressive",
                    value:
                      Math.round((100 * zc.progressive_passes) / tot) + "%",
                  },
                  {
                    label: "Shape W/D",
                    value:
                      sh.width.toFixed(0) + " / " + sh.depth.toFixed(0),
                  },
                ]}
              />
              <h4>25-zone passing map (attacking &rarr;)</h4>
              <HeatmapSVG zones={Object.values(tm.zones)} />
              <h4>Direction sonar</h4>
              <SonarChart
                counts={
                  ins.pass_directions && ins.pass_directions.counts
                }
                team={t}
                teams={teams}
              />
              <h4>Zone flow</h4>
              <StatGrid
                stats={[
                  { label: "Progressive", value: zc.progressive_passes },
                  { label: "Lateral", value: zc.lateral_passes },
                  { label: "Regressive", value: zc.regressive_passes },
                ]}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}
