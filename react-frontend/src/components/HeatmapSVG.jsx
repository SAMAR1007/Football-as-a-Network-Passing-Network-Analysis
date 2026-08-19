import { pitchLines } from "../utils";

export default function HeatmapSVG({ zones }) {
  if (!zones || zones.length === 0) return null;
  const max = Math.max(1, ...zones.map((z) => z.count));
  const rects = zones
    .map((z) => {
      const x = z.col * 24,
        y = z.row * 16,
        inten = z.count / max;
      return `<rect x="${x}" y="${y}" width="24" height="16" fill="rgba(99,102,241,${(
        0.08 +
        0.82 * inten
      ).toFixed(2)})" stroke="rgba(255,255,255,.2)" stroke-width="0.3"/>
      <text x="${x + 12}" y="${y + 9}" text-anchor="middle" font-size="3" fill="#fff" style="paint-order:stroke;stroke:#000;stroke-width:.5">${
        z.count || ""
      }</text>`;
    })
    .join("");
  return (
    <svg className="pitch" viewBox="0 0 120 80">
      <rect x="0" y="0" width="120" height="80" fill="#14361f" />
      <g dangerouslySetInnerHTML={{ __html: rects + pitchLines() }} />
    </svg>
  );
}
