export default function VerdictCard({ verdict }) {
  const v = verdict || {};
  const js = v.justice_score || 0;
  return (
    <div className="verdict">
      <div className="score">
        {v.score || ""}{" "}
        <span className="muted" style={{ fontSize: 16 }}>
          {v.winner || ""}
        </span>
      </div>
      <div className="headline">{v.verdict_headline || ""}</div>
      <div style={{ margin: "10px 0" }}>
        <div className="muted" style={{ fontSize: 12 }}>
          Justice score {js}/100
        </div>
        <div className="bar-h">
          <span style={{ width: `${js}%` }}></span>
        </div>
      </div>
      <p>{v.narrative || ""}</p>
    </div>
  );
}
