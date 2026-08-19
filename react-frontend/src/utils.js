// Utility functions - matching the original script.js behavior exactly

export const esc = (s) =>
  String(s).replace(/[&<>]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])
  );

export const n2 = (x) => (x == null ? "-" : Number(x).toFixed(2));
export const n1 = (x) => (x == null ? "-" : Number(x).toFixed(1));

export const COL = (t, teams) =>
  t === teams?.[0] ? "#3b82f6" : "#ef4444";

export const RGBA = (t, teams, a) =>
  t === teams?.[0]
    ? `rgba(59,130,246,${a})`
    : `rgba(239,68,68,${a})`;

// StatsBomb y maps straight through (0 at top)
export const fy = (y) => y;

// SVG pitch lines
export function pitchLines() {
  const s = 'stroke="rgba(255,255,255,.45)" stroke-width="0.4" fill="none"';
  return (
    `<rect x="0" y="0" width="120" height="80" ${s}/>\n` +
    `<line x1="60" y1="0" x2="60" y2="80" ${s}/><circle cx="60" cy="40" r="9" ${s}/>\n` +
    `<rect x="0" y="18" width="18" height="44" ${s}/><rect x="102" y="18" width="18" height="44" ${s}/>\n` +
    `<rect x="0" y="30" width="6" height="20" ${s}/><rect x="114" y="30" width="6" height="20" ${s}/>`
  );
}

// Team shape calculation
export function shape(net) {
  const P = net.players;
  const ys = P.map((p) => p.avg_y),
    xs = P.map((p) => p.avg_x);
  const width = Math.max(...ys) - Math.min(...ys),
    depth = Math.max(...xs) - Math.min(...xs);
  let sum = 0,
    cnt = 0;
  for (let i = 0; i < P.length; i++)
    for (let j = i + 1; j < P.length; j++) {
      sum += Math.hypot(P[i].avg_x - P[j].avg_x, P[i].avg_y - P[j].avg_y);
      cnt++;
    }
  const comp = cnt ? 100 / (sum / cnt) : 0;
  return { width, depth, comp };
}
