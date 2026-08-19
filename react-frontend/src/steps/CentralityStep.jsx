import { useState, useEffect } from "react";
import { api } from "../api";
import { esc, n2 } from "../utils";
import StatGrid from "../components/StatGrid";

export default function CentralityStep({ match, teams }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!match || teams.length === 0) return;
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const results = await Promise.all(
          teams.map((t) =>
            Promise.all([
              api({ command: "network", match_date: match, team: t }),
              api({ command: "tactical", match_date: match, team: t }),
            ])
          )
        );
        if (!cancelled) setData(results);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [match, teams]);

  if (error) return <p className="loading">Error: {error}</p>;
  if (!data) return <p className="loading">Computing...</p>;

  return (
    <>
      <div className="card">
        <h3>Centrality &amp; roles</h3>
        <p className="muted">
          Betweenness = the connector; eigenvector = connected to the
          well-connected; clustering = tight triangles. Grund centralisation
          shows how much the passing leans on one hub; the weakest link is the
          man to press.
        </p>
      </div>
      <div className="cols">
        {teams.map((t, i) => {
          const [net, tac] = data[i];
          if (!net) return null;
          const cen = tac.centrality || {};
          const top = (key) =>
            [...net.players].sort(
              (a, b) => (b[key] || 0) - (a[key] || 0)
            )[0];
          const wl = net.weakest_link?.weakest_link || {};
          const cp = cen.centrality_percentage;
          const rows = [...net.players]
            .sort((a, b) => b.betweenness_centrality - a.betweenness_centrality)
            .slice(0, 8);
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
                    label: "Grund centralisation",
                    value: cp == null ? "-" : cp.toFixed(0) + "%",
                  },
                  { label: "Style", value: esc(cen.style || "-") },
                  {
                    label: "Top connector",
                    value: esc(
                      (top("betweenness_centrality") || {}).nickname || "-"
                    ),
                  },
                  {
                    label: "Core (eigenvector)",
                    value: esc(
                      (top("eigenvector_centrality") || {}).nickname || "-"
                    ),
                  },
                ]}
              />
              <h4>Centrality (top by betweenness)</h4>
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
                      <td className="num">
                        {n2(p.betweenness_centrality)}
                      </td>
                      <td className="num">
                        {n2(p.eigenvector_centrality)}
                      </td>
                      <td className="num">
                        {n2(p.clustering_coefficient)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h4>Weakest link (press target)</h4>
              <div className="stat">
                <div className="k">
                  {esc(wl.nickname || wl.player || "-")} &middot; score{" "}
                  {n2(wl.weakness_score)}
                </div>
                <div
                  className="v"
                  style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)" }}
                >
                  {(wl.reasons || []).map(esc).join(" &middot; ")}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
