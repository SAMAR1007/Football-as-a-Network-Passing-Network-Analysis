import { COL, RGBA } from "../utils";

const LABELS = [
  "forward", "forward_right", "right", "back_right",
  "back", "back_left", "left", "forward_left",
];
const ANGLES = [270, 315, 0, 45, 90, 135, 180, 225];

export default function SonarChart({ counts, team, teams }) {
  counts = counts || {};
  const max = Math.max(1, ...LABELS.map((l) => counts[l] || 0));
  const cx = 50,
    cy = 50,
    R = 30;
  const pts = LABELS.map((l, i) => {
    const a = (ANGLES[i] * Math.PI) / 180,
      r = ((counts[l] || 0) / max) * R;
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
  }).join(" ");

  return (
    <svg viewBox="0 0 100 100" style={{ width: "100%", maxWidth: 260, display: "block", margin: "0 auto" }}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <circle
          key={f}
          cx={cx}
          cy={cy}
          r={(R * f).toFixed(1)}
          fill="none"
          stroke="var(--line)"
          strokeWidth="0.4"
        />
      ))}
      {ANGLES.map((a, i) => {
        const rad = (a * Math.PI) / 180;
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={(cx + Math.cos(rad) * R).toFixed(1)}
            y2={(cy + Math.sin(rad) * R).toFixed(1)}
            stroke="var(--line)"
            strokeWidth="0.35"
          />
        );
      })}
      <polygon points={pts} fill={RGBA(team, teams, 0.35)} stroke={COL(team, teams)} strokeWidth="1" />
      {LABELS.map((l, i) => {
        const rad = (ANGLES[i] * Math.PI) / 180,
          lr = R + 9;
        return (
          <text
            key={l}
            x={(cx + Math.cos(rad) * lr).toFixed(1)}
            y={(cy + Math.sin(rad) * lr).toFixed(1)}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="3.1"
            fill="var(--muted)"
          >
            {l.replace("_", " ")}
          </text>
        );
      })}
    </svg>
  );
}
