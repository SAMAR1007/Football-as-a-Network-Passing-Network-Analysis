/* ─────────────────────────────────────────────────────────────
   Football as a Network — brand mark.

   A pentagon of five player nodes (the football) feeding a
   central hub node (the hub player) through pass edges (the
   passing network). Drawn in the project's lime accent on
   transparent, clean geometric lines — no gradients or effects.
───────────────────────────────────────────────────────────── */

const LIME = "#c9f53b";

const VERTICES = [
  [32, 10.5],
  [52.5, 25.4],
  [44.6, 49.4],
  [19.4, 49.4],
  [11.5, 25.4],
];

const SPOKES = VERTICES.map(([x, y]) => `M${x} ${y} L32 32`).join(" ");

export default function Logo({ size = 32, className = "" }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Football as a Network logo"
    >
      {/* pentagon ring — the football panel */}
      <polygon
        points={VERTICES.map(([x, y]) => `${x},${y}`).join(" ")}
        stroke={LIME}
        strokeWidth="2.5"
        strokeLinejoin="round"
        opacity="0.45"
      />

      {/* spokes — passes into the hub */}
      <path
        d={SPOKES}
        stroke={LIME}
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.35"
      />

      {/* player nodes */}
      <g fill={LIME}>
        {VERTICES.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3.6" opacity="0.85" />
        ))}

        {/* the hub player */}
        <circle cx="32" cy="32" r="7" />
      </g>
    </svg>
  );
}
