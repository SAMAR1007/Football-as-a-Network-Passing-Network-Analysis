import { useState, useEffect } from "react";
import { api } from "../api";
import { esc, n2, n1 } from "../utils";

/* ── small inline helpers ── */
function DirBar({ fwd, lat, back }) {
  const t = fwd + lat + back || 1;
  return (
    <div className="dir-bar">
      <div className="dir-bar-fill dir-fwd" style={{ width: `${(fwd/t*100).toFixed(0)}%` }} />
      <div className="dir-bar-fill dir-lat" style={{ width: `${(lat/t*100).toFixed(0)}%` }} />
      <div className="dir-bar-fill dir-back" style={{ width: `${(back/t*100).toFixed(0)}%` }} />
    </div>
  );
}

function MiniZoneBar({ zones, max }) {
  const m = max || Math.max(1, ...zones.map(z => z.passes));
  return (
    <div style={{ display:"flex", gap:3, flexWrap:"wrap", marginTop:4 }}>
      {zones.map((z,i) => (
        <span key={i} className="chip" style={{ fontSize:10, display:"inline-flex", alignItems:"center", gap:4 }}>
          <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", background:"var(--accent)", opacity:0.15 + 0.85*(z.passes/m) }} />
          {z.label} {z.passes}
        </span>
      ))}
    </div>
  );
}

/* ── main component ── */
export default function HubAnalysis({ match, teams, title = "6. Hub player tactical analysis" }) {
  const [hubData, setHubData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!match || teams.length < 2) return;
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const results = await Promise.all(
          teams.map(async (t, i) => {
            const opp = teams[1 - i];
            const h = await api({
              command: "hub_tactical",
              match_date: match,
              team: opp,
            });
            return { team: t, data: h };
          })
        );
        if (!cancelled) setHubData(results);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [match, teams]);

  // When printing, expand every collapsible analysis box so the full text
  // appears in the PDF; restore the collapsed state afterwards.
  useEffect(() => {
    const openForPrint = () => {
      document.querySelectorAll("details.r-sec:not([open])").forEach((d) => {
        d.open = true;
        d.setAttribute("data-print-opened", "1");
      });
    };
    const restoreAfterPrint = () => {
      document.querySelectorAll("details.r-sec[data-print-opened]").forEach((d) => {
        d.open = false;
        d.removeAttribute("data-print-opened");
      });
    };
    window.addEventListener("beforeprint", openForPrint);
    window.addEventListener("afterprint", restoreAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", openForPrint);
      window.removeEventListener("afterprint", restoreAfterPrint);
    };
  }, []);

  if (error) return <p className="muted">Hub analysis error: {error}</p>;
  if (!hubData) return <p className="loading">Computing hub analysis...</p>;

  return (
    <div className="card">
      <h4>{title}</h4>
      <div className="cols">
        {hubData.map(({ team, data: hub }) => {
          if (!hub || hub.error) return null;
          const h = hub.hub_player;
          const ctx = hub.team_context;
          const dps = h?.metrics || {};
          const tr = hub.tactical_report || {};

          const domClass =
            ctx?.hub_dominance === "high" ? "b-warn"
            : ctx?.hub_dominance === "medium" ? "b-info" : "b-good";

          const dir = h?.pass_direction_breakdown || {};
          const dist = h?.pass_distance_breakdown || {};
          const ps = h?.pressure_stats || {};
          const conn = h?.top_connections || {};
          const zb = h?.zone_breakdown || {};
          const pb = hub.period_breakdown || {};
          const la = hub.link_up_analysis || {};
          const xt = hub.xt_deep_dive || {};
          const strengths = hub.strengths || [];
          const weaknesses = hub.weaknesses || [];
          const mitigations = hub.mitigation_strategies || [];

          const oppName = hubData.find(d => d.team !== team)?.team || "";

          return (
            <div className="card hub-card" key={team}>
              {/* ── Header ── */}
              <div className="teamhdr">
                <span className="dot" style={{ background: team === teams[0] ? "#3b82f6" : "#ef4444" }} />
                How <b>{esc(team)}</b> should contain <b>{esc(oppName)}</b>
              </div>

              {/* ── Player Profile ── */}
              <div className="hub-header">
                <div className="hub-header-main">
                  <div className="hub-name">{esc(h?.nickname)}</div>
                  <span className={`badge ${domClass}`}>
                    {(ctx?.hub_dominance || "LOW").toUpperCase()} IMPACT
                  </span>
                  <span className="hub-pos">
                    {esc(h?.position)} &middot; x={h?.avg_x?.toFixed(0)} y={h?.avg_y?.toFixed(0)}
                  </span>
                </div>
                <div className="hub-stats-row">
                  <div className="hub-stat">
                    <span className="hub-stat-v">{dps.total_involvement}</span>
                    <span className="hub-stat-l">Involvements</span>
                  </div>
                  <div className="hub-stat">
                    <span className="hub-stat-v">{dps.passes_made}/{dps.passes_received}</span>
                    <span className="hub-stat-l">Made/Recv</span>
                  </div>
                  <div className="hub-stat">
                    <span className="hub-stat-v">{n1(dps.degree_centrality)}</span>
                    <span className="hub-stat-l">Degree</span>
                  </div>
                  <div className="hub-stat">
                    <span className="hub-stat-v">{n2(dps.betweenness_centrality)}</span>
                    <span className="hub-stat-l">Betweenness</span>
                  </div>
                  <div className="hub-stat">
                    <span className="hub-stat-v">{dps.xt_generated != null ? n2(dps.xt_generated) : "-"}</span>
                    <span className="hub-stat-l">xT</span>
                  </div>
                  <div className="hub-stat">
                    <span className="hub-stat-v">{dps.forward_pass_pct}%</span>
                    <span className="hub-stat-l">Fwd %</span>
                  </div>
                </div>
                <p className="hub-narrative">{esc(hub.narrative)}</p>
              </div>

              {/* ── Passing Direction & Distance ── */}
              <div className="hub-grid">
                <div className="hub-section">
                  <h4 className="hub-sec-title">Passing direction</h4>
                  <div className="statgrid" style={{ gridTemplateColumns:"1fr 1fr 1fr", gap:4 }}>
                    <div className="stat">
                      <div className="k" style={{color:"var(--good)"}}>Forward</div>
                      <div className="v" style={{fontSize:14}}>{dir.forward_pct || 0}%</div>
                    </div>
                    <div className="stat">
                      <div className="k" style={{color:"var(--warn)"}}>Lateral</div>
                      <div className="v" style={{fontSize:14}}>{dir.lateral_pct || 0}%</div>
                    </div>
                    <div className="stat">
                      <div className="k" style={{color:"var(--bad)"}}>Backward</div>
                      <div className="v" style={{fontSize:14}}>{dir.backward_pct || 0}%</div>
                    </div>
                  </div>
                  <DirBar fwd={dir.forward_count||0} lat={dir.lateral_count||0} back={dir.backward_count||0} />
                </div>
                <div className="hub-section">
                  <h4 className="hub-sec-title">Pass distance</h4>
                  <div className="statgrid" style={{ gridTemplateColumns:"1fr 1fr 1fr", gap:4 }}>
                    <div className="stat">
                      <div className="k">Short</div>
                      <div className="v" style={{fontSize:14}}>{dist.short_pct || 0}%</div>
                    </div>
                    <div className="stat">
                      <div className="k">Medium</div>
                      <div className="v" style={{fontSize:14}}>{dist.medium_pct || 0}%</div>
                    </div>
                    <div className="stat">
                      <div className="k">Long</div>
                      <div className="v" style={{fontSize:14}}>{dist.long_pct || 0}%</div>
                    </div>
                  </div>
                  <p className="muted" style={{fontSize:11,marginTop:4}}>Avg distance: {dist.avg_distance || 0}m</p>
                </div>
              </div>

              {/* ── NEW: Pressure Stats ── */}
              {ps.passes_under_pressure > 0 && (
                <div className="hub-section" style={{marginBottom:10}}>
                  <h4 className="hub-sec-title">Pressure resistance</h4>
                  <div className="statgrid" style={{gridTemplateColumns:"1fr 1fr 1fr", gap:4}}>
                    <div className="stat">
                      <div className="k">Normal accuracy</div>
                      <div className="v" style={{fontSize:14,color:"var(--good)"}}>{ps.normal_accuracy}%</div>
                    </div>
                    <div className="stat">
                      <div className="k">Under pressure</div>
                      <div className="v" style={{fontSize:14,color:ps.accuracy_drop > 10 ? "var(--bad)" : "var(--good)"}}>
                        {ps.pressure_accuracy != null ? `${ps.pressure_accuracy}%` : "N/A"}
                      </div>
                    </div>
                    <div className="stat">
                      <div className="k">Accuracy drop</div>
                      <div className="v" style={{fontSize:14,color:ps.accuracy_drop > 10 ? "var(--bad)" : "var(--warn)"}}>
                        {ps.accuracy_drop != null ? `-${ps.accuracy_drop}pp` : "N/A"}
                      </div>
                    </div>
                  </div>
                  {(ps.accuracy_drop != null && ps.accuracy_drop > 0) && (
                    <div className="bar-h" style={{marginTop:4,height:6}}>
                      <span style={{
                        width:`${Math.min(100, ps.normal_accuracy)}%`,
                        background:"var(--good)",
                        display:"inline-block",
                        height:"100%",
                        borderRadius:999,
                        position:"relative"
                      }}>
                        <span style={{
                          position:"absolute",right:0,top:0,
                          width:`${-Math.min(0,ps.pressure_accuracy-ps.normal_accuracy)}%`,
                          height:"100%",background:"var(--bad)",
                          borderRadius:999,
                          opacity:0.6
                        }} />
                      </span>
                    </div>
                  )}
                  <p className="muted" style={{fontSize:11,marginTop:4}}>
                    {ps.passes_under_pressure} passes faced under pressure
                  </p>
                </div>
              )}

              {/* ── NEW: Top Connections ── */}
              {(conn.recipients?.length > 0 || conn.sources?.length > 0) && (
                <div className="hub-section" style={{marginBottom:10}}>
                  <h4 className="hub-sec-title">Top connections</h4>
                  <div className="conn-grid">
                    <div>
                      <p className="muted" style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:4}}>Passes to</p>
                      {conn.recipients?.slice(0,4).map((r,i) => (
                        <div key={i} className="partner-card" style={{marginBottom:4}}>
                          <span className="partner-name">{esc(r.nickname)}</span>
                          <span className="partner-count">{r.passes} passes</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="muted" style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:4}}>Receives from</p>
                      {conn.sources?.slice(0,4).map((s,i) => (
                        <div key={i} className="partner-card" style={{marginBottom:4}}>
                          <span className="partner-name">{esc(s.nickname)}</span>
                          <span className="partner-count">{s.passes} passes</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── NEW: Zone Breakdown ── */}
              {zb.top_zones?.length > 0 && (
                <div className="hub-section" style={{marginBottom:10}}>
                  <h4 className="hub-sec-title">Zone activity</h4>
                  <div className="statgrid" style={{gridTemplateColumns:"1fr 1fr 1fr",gap:4}}>
                    <div className="stat">
                      <div className="k" style={{color:"var(--good)"}}>Defensive 3rd</div>
                      <div className="v" style={{fontSize:14}}>{zb.defensive_third_pct}%</div>
                    </div>
                    <div className="stat">
                      <div className="k" style={{color:"var(--warn)"}}>Middle 3rd</div>
                      <div className="v" style={{fontSize:14}}>{zb.middle_third_pct}%</div>
                    </div>
                    <div className="stat">
                      <div className="k" style={{color:"var(--bad)"}}>Attacking 3rd</div>
                      <div className="v" style={{fontSize:14}}>{zb.attacking_third_pct}%</div>
                    </div>
                  </div>
                  <div className="dir-bar" style={{height:6}}>
                    <div className="dir-bar-fill dir-fwd" style={{width:`${zb.defensive_third_pct}%`}} />
                    <div className="dir-bar-fill dir-lat" style={{width:`${zb.middle_third_pct}%`}} />
                    <div className="dir-bar-fill dir-back" style={{width:`${zb.attacking_third_pct}%`}} />
                  </div>
                  <MiniZoneBar zones={zb.top_zones} max={zb.top_zones[0]?.passes} />
                  <p className="muted" style={{fontSize:11,marginTop:4}}>
                    Primary phase: {esc(zb.primary_phase || "N/A")}
                  </p>
                </div>
              )}

              {/* ── NEW: Period Breakdown ── */}
              {pb.has_data && (
                <div className="hub-section" style={{marginBottom:10}}>
                  <h4 className="hub-sec-title">Half comparison</h4>
                  <div className="statgrid" style={{gridTemplateColumns:"1fr 1fr",gap:4}}>
                    <div className="stat">
                      <div className="k">1st Half</div>
                      <div className="v" style={{fontSize:14}}>
                        {pb.first_half?.passes || 0} passes
                      </div>
                      <div className="k" style={{marginTop:2}}>
                        Acc: {pb.first_half?.accuracy || 0}% &middot; Fwd: {pb.first_half?.forward_pct || 0}%
                      </div>
                    </div>
                    <div className="stat">
                      <div className="k">2nd Half</div>
                      <div className="v" style={{fontSize:14}}>
                        {pb.second_half?.passes || 0} passes
                      </div>
                      <div className="k" style={{marginTop:2}}>
                        Acc: {pb.second_half?.accuracy || 0}% &middot; Fwd: {pb.second_half?.forward_pct || 0}%
                      </div>
                    </div>
                  </div>

                  {/* 15-min interval chart */}
                  {pb.intervals?.length > 0 && (
                    <>
                      <p className="muted" style={{fontSize:10,marginTop:6,marginBottom:2,textTransform:"uppercase",letterSpacing:"0.04em"}}>
                        15-min activity
                      </p>
                      <div className="int-chart">
                        {pb.intervals.map((iv,i) => {
                          const maxPass = Math.max(1, ...pb.intervals.map(x=>x.passes));
                          return (
                            <div key={i} className="int-bar" title={`${iv.label}: ${iv.passes} passes (${iv.accuracy}% acc)`}>
                              <div className="int-fill" style={{
                                height:`${(iv.passes/maxPass*100).toFixed(0)}%`,
                                background: iv.accuracy > 80 ? "var(--good)" : iv.accuracy > 60 ? "var(--accent)" : "var(--warn)"
                              }} />
                              <span className="int-label">{iv.passes}</span>
                              <span className="interval-range">{iv.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── NEW: Link-up Analysis ── */}
              {la.top_partners?.length > 0 && (
                <div className="hub-section" style={{marginBottom:10}}>
                  <h4 className="hub-sec-title">Link-up partners</h4>
                  {la.top_partners.slice(0,4).map((p,i) => (
                    <div key={i} className="partner-card" style={{marginBottom:5}}>
                      <div>
                        <span className="partner-name">{esc(p.nickname)}</span>
                        <span className="partner-arrow"> &harr; </span>
                        <span className="partner-count">{p.total_exchanges} exchanges</span>
                      </div>
                      <div style={{fontSize:11,color:"var(--muted)"}}>
                        {p.passes_to} to &middot; {p.passes_from} from
                      </div>
                    </div>
                  ))}
                  <p className="muted" style={{fontSize:11,marginTop:4}}>
                    {la.total_connections} unique connections
                  </p>
                </div>
              )}

              {/* ── NEW: xT Deep Dive ── */}
              {xt.has_data && (
                <div className="hub-section" style={{marginBottom:10}}>
                  <h4 className="hub-sec-title">xT threat analysis</h4>
                  <div className="statgrid" style={{gridTemplateColumns:"1fr 1fr 1fr",gap:4}}>
                    <div className="stat">
                      <div className="k">Total xT</div>
                      <div className="v" style={{fontSize:14}}>{n2(xt.total_xt)}</div>
                    </div>
                    <div className="stat">
                      <div className="k">Per pass</div>
                      <div className="v" style={{fontSize:14}}>{n2(xt.xt_per_pass)}</div>
                    </div>
                    <div className="stat">
                      <div className="k">Pos/Neg</div>
                      <div className="v" style={{fontSize:14,color:xt.positive_xt_passes > xt.negative_xt_passes ? "var(--good)" : "var(--bad)"}}>
                        {xt.positive_xt_passes}/{xt.negative_xt_passes}
                      </div>
                    </div>
                  </div>
                  <div className="xt-phase">
                    {Object.entries(xt.xt_by_phase || {}).map(([phase,val]) => (
                      <span key={phase} className="chip" style={{
                        borderColor: phase === "attacking" ? "var(--bad)" : phase === "middle" ? "var(--warn)" : "var(--good)"
                      }}>
                        {esc(phase)}: {n2(val)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Strengths & Weaknesses ── */}
              <div className="hub-grid">
                <div className="hub-section">
                  <h4 style={{margin:"0 0 6px",color:"var(--good)"}}>Strengths</h4>
                  {strengths.length > 0 ? strengths.map((s,i) => (
                    <div key={i} className="stat" style={{
                      fontSize:12,padding:"7px 10px",
                      borderLeft:"3px solid var(--good)",
                      marginBottom:5
                    }}>
                      <div style={{display:"flex",alignItems:"center",gap:4,fontWeight:600}}>
                        {esc(s.type.replace(/_/g," "))}
                        {s.badge && <span className="badge b-info">{s.badge}</span>}
                      </div>
                      <div style={{color:"var(--muted)",fontSize:11,marginTop:2}}>{esc(s.message)}</div>
                    </div>
                  )) : <p className="muted" style={{fontSize:12}}>No specific strengths identified.</p>}
                </div>
                <div className="hub-section">
                  <h4 style={{margin:"0 0 6px",color:"var(--bad)"}}>Weaknesses</h4>
                  {weaknesses.length > 0 ? weaknesses.map((w,i) => (
                    <div key={i} className="stat" style={{
                      fontSize:12,padding:"7px 10px",
                      borderLeft:"3px solid var(--bad)",
                      marginBottom:5
                    }}>
                      <div style={{display:"flex",alignItems:"center",gap:4,fontWeight:600}}>
                        {esc(w.type.replace(/_/g," "))}
                        <span className={`badge ${w.severity === "high" ? "b-bad" : w.severity === "medium" ? "b-warn" : "b-info"}`}>
                          {w.severity}
                        </span>
                      </div>
                      <div style={{color:"var(--muted)",fontSize:11,marginTop:2}}>{esc(w.message)}</div>
                    </div>
                  )) : <p className="muted" style={{fontSize:12}}>No specific weaknesses identified.</p>}
                </div>
              </div>

              {/* ── Tactical recommendations ── */}
              {mitigations.length > 0 && (
                <>
                  <h4 style={{margin:"12px 0 8px"}}>Tactical recommendations</h4>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {mitigations.map((m,i) => (
                      <div key={i} className="stat" style={{
                        fontSize:12,padding:"8px 10px",
                        borderLeft:`3px solid ${
                          m.type === "man_marking" ? "#f59e0b"
                          : m.type === "pressing" ? "#ef4444"
                          : m.type === "positional" ? "#3b82f6"
                          : m.type === "double_team" ? "#8b5cf6"
                          : m.type === "interception" ? "#22c55e"
                          : "#6366f1"
                        }`
                      }}>
                        <div style={{display:"flex",alignItems:"center",gap:6,fontWeight:600}}>
                          {esc(m.title)}
                          <span className={`badge ${m.severity === "high" ? "b-bad" : m.severity === "medium" ? "b-warn" : "b-info"}`}>
                            {m.severity}
                          </span>
                        </div>
                        <div style={{color:"var(--muted)",fontSize:11,marginTop:3}}>{esc(m.text)}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── NEW: Exploitation Guide ── */}
              {tr.exploitation_guide && (
                <details className="r-sec" style={{marginTop:10}}>
                  <summary>
                    <span className="r-icon">&#9888;</span> Exploitation guide
                  </summary>
                  <ul className="exploit-list">
                    {tr.exploitation_guide.split("\n").filter(l=>l.startsWith("-")).map((line,i) => (
                      <li key={i}>{esc(line.replace(/^- /,""))}</li>
                    ))}
                  </ul>
                </details>
              )}

              {/* ── NEW: Key Battles ── */}
              {tr.key_battles && (
                <details className="r-sec">
                  <summary>
                    <span className="r-icon">&#9876;</span> Key battles
                  </summary>
                  <div className="r-body">
                    {tr.key_battles.split(". ").filter(s=>s.trim()).map((s,i) => (
                      <div key={i} className="battle-item">{esc(s)}.</div>
                    ))}
                  </div>
                </details>
              )}

              {/* ── NEW: Role Analysis (collapsible) ── */}
              {tr.role_analysis && (
                <details className="r-sec">
                  <summary>
                    <span className="r-icon">&#127915;</span> Role analysis
                  </summary>
                  <div className="r-body">{esc(tr.role_analysis)}</div>
                </details>
              )}

              {/* ── NEW: Spatial Influence ── */}
              {tr.spatial_influence && (
                <details className="r-sec">
                  <summary>
                    <span className="r-icon">&#127758;</span> Spatial influence
                  </summary>
                  <div className="r-body">{esc(tr.spatial_influence)}</div>
                </details>
              )}

              {/* ── NEW: Temporal Pattern ── */}
              {tr.temporal_pattern && (
                <details className="r-sec">
                  <summary>
                    <span className="r-icon">&#128197;</span> Temporal pattern
                  </summary>
                  <div className="r-body">{esc(tr.temporal_pattern)}</div>
                </details>
              )}

              {/* ── Executive summary ── */}
              {tr.executive_summary && (
                <details className="r-sec" open>
                  <summary>
                    <span className="r-icon">&#128202;</span> Executive summary
                  </summary>
                  <div className="r-body">{esc(tr.executive_summary)}</div>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
