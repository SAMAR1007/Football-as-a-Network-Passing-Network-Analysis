import { COL, RGBA, fy, esc, pitchLines } from "../utils";

export default function NetworkSVG({ net, team, teams }) {
  const maxW = Math.max(1, ...net.edges.map((e) => e.weight));
  const maxInv = Math.max(1, ...net.players.map((p) => p.total_involvement));

  const edgesHtml = net.edges
    .filter((e) => e.weight >= 3)
    .map(
      (e) =>
        `<line x1="${e.source_x}" y1="${fy(e.source_y)}" x2="${e.target_x}" y2="${fy(
          e.target_y
        )}" stroke="${RGBA(team, teams, 0.15 + 0.55 * (e.weight / maxW))}" stroke-width="${(
          0.25 +
          1.7 * (e.weight / maxW)
        ).toFixed(2)}"/>`
    )
    .join("");

  const playersHtml = net.players
    .map((p) => {
      const r = 1.6 + 3.2 * (p.total_involvement / maxInv);
      return `<circle cx="${p.avg_x}" cy="${fy(p.avg_y)}" r="${r.toFixed(
        2
      )}" fill="${COL(team, teams)}" stroke="#fff" stroke-width="0.4"/>
      <text x="${p.avg_x}" y="${fy(p.avg_y) - r - 0.6}" text-anchor="middle" font-size="2.4" fill="#fff" style="paint-order:stroke;stroke:#000;stroke-width:.5">${esc(
        p.nickname || p.name
      )}</text>`;
    })
    .join("");

  return (
    <svg className="pitch" viewBox="0 0 120 80">
      <rect x="0" y="0" width="120" height="80" fill="#14361f" />
      <g dangerouslySetInnerHTML={{ __html: pitchLines() + edgesHtml + playersHtml }} />
    </svg>
  );
}
