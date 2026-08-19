import { useState, useEffect } from "react";
import { api } from "../api";
import { esc, n2 } from "../utils";
import VerdictCard from "../components/VerdictCard";
import GoalPitch from "../components/GoalPitch";

export default function StoryStep({ match, teams }) {
  const [tl, setTl] = useState(null);
  const [goals, setGoals] = useState(null);
  const [shots, setShots] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!match || teams.length === 0) return;
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const [t, g] = await Promise.all([
          api({ command: "timeline", match_date: match }),
          api({ command: "goals", match_date: match }),
        ]);
        const s = await Promise.all(
          teams.map((tm) =>
            api({ command: "shots", match_date: match, team: tm })
          )
        );
        if (!cancelled) {
          setTl(t);
          setGoals(g);
          setShots(s);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [match, teams]);

  if (error) return <p className="loading">Error: {error}</p>;
  if (!tl || !goals || !shots) return <p className="loading">Computing...</p>;

  const strip = (tl.periods || [])
    .map((p) => {
      let lead = teams[0],
        best = -1;
      teams.forEach((t) => {
        const q = p.teams?.[t]?.possession ?? 0;
        if (q > best) {
          best = q;
          lead = t;
        }
      });
      return `<div class="seg" title="${p.label}: ${lead} ${best.toFixed(0)}%" style="height:${20 + 0.8 * best}%;background:${lead === teams[0] ? "#3b82f6" : "#ef4444"}"></div>`;
    })
    .join("");
  const shifts = tl.insights?.momentum_shifts?.length ?? 0;

  return (
    <>
      <div className="card">
        <h3>The match story &amp; verdict</h3>
        <VerdictCard verdict={tl.verdict || {}} />
      </div>
      <div className="card">
        <h4>Timeline (5-minute windows, coloured by who led)</h4>
        <div
          className="timeline-strip"
          dangerouslySetInnerHTML={{ __html: strip }}
        />
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          {shifts} momentum shift{shifts === 1 ? "" : "s"} across the match.
        </p>
      </div>
      <div className="card">
        <h3>Goals - build-up xT trails</h3>
        <div className="cols">
          {(goals.goals || []).length > 0
            ? goals.goals.map((g, i) => (
                <GoalPitch key={i} goal={g} teams={teams} />
              ))
            : <p className="muted">No goals in the data.</p>}
        </div>
      </div>
      <div className="cols">
        {teams.map((t, i) => {
          const rows = (shots[i].players || []).slice(0, 6);
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
                {esc(t)} shots
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Player</th>
                    <th className="num">Sh</th>
                    <th className="num">G</th>
                    <th className="num">xG</th>
                    <th className="num">xG diff</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.player}>
                      <td>{esc(p.nickname || p.player)}</td>
                      <td className="num">{p.shots}</td>
                      <td className="num">{p.goals}</td>
                      <td className="num">{n2(p.xg)}</td>
                      <td
                        className="num"
                        style={{
                          color:
                            p.xg_difference >= 0
                              ? "var(--good)"
                              : "var(--bad)",
                        }}
                      >
                        {p.xg_difference >= 0 ? "+" : ""}
                        {n2(p.xg_difference)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </>
  );
}
