export function Stat({ label, value, valueStyle }) {
  return (
    <div className="stat">
      <div className="k">{label}</div>
      <div className="v" style={valueStyle}>{value}</div>
    </div>
  );
}

export default function StatGrid({ stats, style }) {
  if (!stats || stats.length === 0) return null;
  return (
    <div className="statgrid" style={style}>
      {stats.map((s, i) => (
        <Stat key={i} label={s.label} value={s.value} valueStyle={s.valueStyle} />
      ))}
    </div>
  );
}
