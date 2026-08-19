import { COL, fy, esc, n2, pitchLines } from "../utils";

export default function GoalPitch({ goal, teams }) {
  if (!goal) return null;
  let inner = "";
  (goal.buildup_sequence || []).forEach((ev) => {
    if (ev.end_x == null) return;
    const good = (ev.xt_added || 0) >= 0;
    inner += `<line x1="${ev.x}" y1="${fy(ev.y)}" x2="${ev.end_x}" y2="${fy(ev.end_y)}" stroke="${
      good ? "#22c55e" : "#94a3b8"
    }" stroke-width="0.8" opacity="0.9"/>
      <circle cx="${ev.x}" cy="${fy(ev.y)}" r="0.8" fill="#fff"/>`;
  });
  inner += `<circle cx="${goal.x}" cy="${fy(goal.y)}" r="1.8" fill="#fbbf24" stroke="#000" stroke-width="0.4"/>`;

  return (
    <div className="card">
      <div className="teamhdr">
        <span className="dot" style={{ background: COL(goal.team, teams) }}></span>
        {goal.scorer} &middot; {goal.minute}'
      </div>
      <p className="muted" style={{ fontSize: 12 }}>
        xG {n2(goal.xg)} &middot; build-up xT {n2(goal.buildup_xt)} over {goal.buildup_events} events
      </p>
      <svg className="pitch" viewBox="0 0 120 80" style={{ maxHeight: 160 }}>
        <rect x="0" y="0" width="120" height="80" fill="#14361f" />
        <g dangerouslySetInnerHTML={{ __html: pitchLines() + inner }} />
      </svg>
    </div>
  );
}
