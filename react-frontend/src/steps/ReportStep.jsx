import { useState, useEffect } from "react";
import { api } from "../api";
import { esc, n2, n1, shape, COL } from "../utils";
import NetworkSVG from "../components/NetworkSVG";
import Logo from "../components/Logo";
import HeatmapSVG from "../components/HeatmapSVG";
import SonarChart from "../components/SonarChart";
import VerdictCard from "../components/VerdictCard";
import GoalPitch from "../components/GoalPitch";
import StatGrid from "../components/StatGrid";
import HubAnalysis from "../components/HubAnalysis";

export default function ReportStep({ match, teams }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!match || teams.length === 0) return;
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const [cmp, tl, goals] = await Promise.all([
          api({ command: "compare", match_date: match }),
          api({ command: "timeline", match_date: match }),
          api({ command: "goals", match_date: match }),
        ]);
        const per = await Promise.all(
          teams.map((t) =>
            Promise.all([
              api({ command: "network", match_date: match, team: t }),
              api({ command: "tactical", match_date: match, team: t }),
              api({ command: "tactical_map", match_date: match, team: t }),
              api({ command: "insights", match_date: match, team: t }),
              api({ command: "zone_connections", match_date: match, team: t }),
              api({ command: "shots", match_date: match, team: t }),
            ])
          )
        );
        if (!cancelled) setData({ cmp, tl, goals, per });
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [match, teams]);

  if (error) return <p className="loading">Error: {error}</p>;
  if (!data) return <p className="loading">Computing...</p>;

  const { cmp, tl, goals, per } = data;
  const v = tl.verdict || {};

  const matchInfo = window.__MATCH_INFO || {};

  // Timeline strip
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
      return `<div class="seg" title="${p.label}" style="height:${20 + 0.8 * best}%;background:${lead === teams[0] ? "#3b82f6" : "#ef4444"}"></div>`;
    })
    .join("");

  // Head to head table
  const h2h = teams
    .map((t, i) => {
      const c = (cmp.teams || {})[t] || {},
        mm = per[i][0].metrics,
        wl = per[i][0].weakest_link?.weakest_link || {};
      return `<tr><td><span class="dot" style="background:${COL(t, teams)}"></span>${esc(t)}</td><td class="num">${c.passes ?? "-"}</td><td class="num">${(mm.density * 100).toFixed(0)}%</td><td>${esc(mm.hub || mm.hub_player || "-")}</td><td class="num">${c.ppda?.ppda == null ? "-" : n1(c.ppda.ppda)}</td><td class="num">${c.field_tilt?.field_tilt == null ? "-" : c.field_tilt.field_tilt.toFixed(0) + "%"}</td><td class="num">${n2(c.xt)}</td><td>${esc(wl.nickname || "-")}</td></tr>`;
    })
    .join("");

  return (
    <>
      <div className="card report-masthead">
        <div className="report-masthead__top">
          <div className="report-brand">
            <Logo size={42} />
            <div className="report-brand__text">
              <span className="report-brand__name">
                Football as a <em>Network</em>
              </span>
              <span className="report-brand__tag">
                Passing network analysis framework
              </span>
            </div>
          </div>
          <div className="report-masthead__meta">
            <h3 className="report-title">
              Full report - the complete analysis
            </h3>
            <button
              className="btn"
              onClick={() => window.print()}
            >
              Print / Save as PDF
            </button>
          </div>
        </div>
        <div className="report-masthead__rule" />
        <p className="report-match">
          <b>{esc(matchInfo.home_team)} vs {esc(matchInfo.away_team)}</b> -{" "}
          {esc(matchInfo.competition)}, {esc(matchInfo.date_display || match)}.
        </p>
      </div>

      <div className="card">
        <h4>1. Executive summary</h4>
        <VerdictCard verdict={v} />
        <table style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Team</th>
              <th className="num">Passes</th>
              <th className="num">Density</th>
              <th>Hub</th>
              <th className="num">PPDA</th>
              <th className="num">Field tilt</th>
              <th className="num">xT</th>
              <th>Weakest link</th>
            </tr>
          </thead>
          <tbody dangerouslySetInnerHTML={{ __html: h2h }} />
        </table>
      </div>

      <div className="card">
        <h4>2. Passing networks</h4>
        <div className="cols">
          {teams.map((t, i) => {
            const net = per[i][0],
              mm = net.metrics;
            const rows = [...net.players]
              .sort((a, b) => b.total_involvement - a.total_involvement)
              .slice(0, 6);
            return (
              <div className="card" key={t}>
                <div className="teamhdr">
                  <span className="dot" style={{ background: COL(t, teams) }}></span>
                  {esc(t)}
                </div>
                <NetworkSVG net={net} team={t} teams={teams} />
                <StatGrid
                  stats={[
                    { label: "Density", value: (mm.density * 100).toFixed(0) + "%" },
                    { label: "Hub", value: esc(mm.hub || mm.hub_player || "-") },
                    { label: "Players", value: mm.num_players },
                    { label: "Links", value: mm.num_edges },
                  ]}
                />
                <table>
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th className="num">Made</th>
                      <th className="num">Recv</th>
                      <th className="num">Degree</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr key={p.name}>
                        <td>{esc(p.nickname || p.name)}</td>
                        <td className="num">{p.passes_made}</td>
                        <td className="num">{p.passes_received}</td>
                        <td className="num">{n2(p.degree_centrality)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h4>3. Centrality &amp; roles</h4>
        <div className="cols">
          {teams.map((t, i) => {
            const net = per[i][0],
              cen = per[i][1].centrality || {},
              wl = net.weakest_link?.weakest_link || {};
            const rows = [...net.players]
              .sort((a, b) => b.betweenness_centrality - a.betweenness_centrality)
              .slice(0, 6);
            return (
              <div className="card" key={t}>
                <div className="teamhdr">
                  <span className="dot" style={{ background: COL(t, teams) }}></span>
                  {esc(t)}
                </div>
                <StatGrid
                  stats={[
                    { label: "Grund", value: cen.centrality_percentage == null ? "-" : cen.centrality_percentage.toFixed(0) + "%" },
                    { label: "Style", value: esc(cen.style || "-") },
                    { label: "Weakest link", value: esc(wl.nickname || wl.player || "-") },
                  ]}
                />
                <table>
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th className="num">Between</th>
                      <th className="num">Eigen</th>
                      <th className="num">Cluster</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr key={p.name}>
                        <td>{esc(p.nickname || p.name)}</td>
                        <td className="num">{n2(p.betweenness_centrality)}</td>
                        <td className="num">{n2(p.eigenvector_centrality)}</td>
                        <td className="num">{n2(p.clustering_coefficient)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="muted" style={{ fontSize: 12 }}>
                  {(wl.reasons || []).map(esc).join(" &middot; ")}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h4>4. Tactical geography</h4>
        <div className="cols">
          {teams.map((t, i) => {
            const net = per[i][0],
              tm = per[i][2],
              ins = per[i][3],
              zc = per[i][4];
            const c = (cmp.teams || {})[t] || {},
              sh = shape(net);
            return (
              <div className="card" key={t}>
                <div className="teamhdr">
                  <span className="dot" style={{ background: COL(t, teams) }}></span>
                  {esc(t)}
                </div>
                <StatGrid
                  stats={[
                    { label: "PPDA", value: c.ppda?.ppda == null ? "-" : n1(c.ppda.ppda) },
                    { label: "Field tilt", value: c.field_tilt?.field_tilt == null ? "-" : c.field_tilt.field_tilt.toFixed(0) + "%" },
                    { label: "Shape W/D", value: sh.width.toFixed(0) + "/" + sh.depth.toFixed(0) },
                    { label: "Progressive", value: zc.progressive_passes },
                  ]}
                />
                <h4>25-zone map</h4>
                <HeatmapSVG zones={Object.values(tm.zones)} />
                <h4>Direction sonar</h4>
                <SonarChart counts={ins.pass_directions && ins.pass_directions.counts} team={t} teams={teams} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h4>5. Match story</h4>
        <div className="timeline-strip" dangerouslySetInnerHTML={{ __html: strip }} />
        <h4>Goals - build-up xT trails</h4>
        <div className="cols">
          {(goals.goals || []).length > 0
            ? goals.goals.map((g, i) => <GoalPitch key={i} goal={g} teams={teams} />)
            : <p className="muted">No goals in the data.</p>}
        </div>
        <div className="cols">
          {teams.map((t, i) => {
            const rows = (per[i][5].players || []).slice(0, 6);
            return (
              <div className="card" key={t}>
                <div className="teamhdr">
                  <span className="dot" style={{ background: COL(t, teams) }}></span>
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
                        <td className="num" style={{ color: p.xg_difference >= 0 ? "var(--good)" : "var(--bad)" }}>
                          {p.xg_difference >= 0 ? "+" : ""}{n2(p.xg_difference)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>

      <HubAnalysis match={match} teams={teams} />

      <div className="card">
        <h4>7. How to read it</h4>
        <p className="muted">
          The verdict's justice score (25 + 18.75 per metric the winner led, out
          of xG / xT / possession / passes) says how well the result matched the
          balance of play. A dominant network (high density, distributed hub)
          with strong pressing (low PPDA) and territory (high field tilt) that
          agrees with the scoreline is a deserved win; when they disagree, it is
          a smash-and-grab.
        </p>
      </div>
    </>
  );
}
