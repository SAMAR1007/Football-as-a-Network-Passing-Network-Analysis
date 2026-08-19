import { useState, useEffect } from "react";
import { api } from "../api";
import { esc, n2 } from "../utils";
import NetworkSVG from "../components/NetworkSVG";
import StatGrid from "../components/StatGrid";

export default function NetworkStep({ match, teams }) {
  const [nets, setNets] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!match || teams.length === 0) return;
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const results = await Promise.all(
          teams.map((t) => api({ command: "network", match_date: match, team: t }))
        );
        if (!cancelled) setNets(results);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [match, teams]);

  if (error) return <p className="loading">Error: {error}</p>;
  if (!nets) return <p className="loading">Computing...</p>;

  return (
    <>
      <div className="card">
        <h3>The passing network</h3>
        <p className="muted">
          Each dot is a player at their average passing position, sized by
          involvement; lines are pass combinations (3+), thicker = more used.
          Density = combinations used / possible; the hub is the most involved
          player.
        </p>
      </div>
      <div className="cols">
        {teams.map((t, i) => {
          const net = nets[i];
          if (!net) return null;
          const m = net.metrics;
          const rows = [...net.players]
            .sort((a, b) => b.total_involvement - a.total_involvement)
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
              <NetworkSVG net={net} team={t} teams={teams} />
              <StatGrid
                stats={[
                  { label: "Density", value: (m.density * 100).toFixed(0) + "%" },
                  { label: "Hub", value: esc(m.hub || m.hub_player || "-") },
                  { label: "Players", value: m.num_players },
                  { label: "Connections", value: m.num_edges },
                ]}
              />
              <h4>Most involved</h4>
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
    </>
  );
}
