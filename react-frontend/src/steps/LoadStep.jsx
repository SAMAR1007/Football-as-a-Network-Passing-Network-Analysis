import { esc } from "../utils";
import StatGrid from "../components/StatGrid";

export default function LoadStep({ matchInfo, allMatches, teams }) {
  const m = matchInfo || {};

  const REQUIRED_COLS = ["team_name", "event_type", "minute"];
  const cols =
    (allMatches && allMatches[0] && allMatches[0].columns) || REQUIRED_COLS;

  return (
    <>
      <div className="card">
        <h3>
          {esc(m.home_team || "")} vs {esc(m.away_team || "")}
        </h3>
        <p className="muted">
          {esc(m.competition || "")} &middot; {esc(m.date_display || "")}{" "}
          &middot; {m.events || "?"} events
        </p>
        <StatGrid
          stats={[
            { label: "Home", value: esc(m.home_team || "-") },
            { label: "Away", value: esc(m.away_team || "-") },
            { label: "Events", value: m.events || "-" },
            { label: "Teams", value: teams.length },
          ]}
        />
        <p className="muted">
          Move through the six steps above. Every module runs on this match's
          real event data; steps 2-4 show both teams side by side.
        </p>
      </div>
      <div className="card">
        <h3>Add your own match</h3>
        <p className="muted">
          Use the <b>Upload</b> control in the bar above to add StatsBomb-format
          event data. A single <code>.csv</code> adds one match; a multi-sheet
          Excel workbook (<code>.xlsx</code>) adds <b>every sheet as its own
          match</b>, all at once. The three highlighted columns are the minimum
          required (<code>team_name</code>, <code>event_type</code>,{" "}
          <code>minute</code>); the rest unlock the full analysis.
        </p>
        <h4>Columns (the bundled matches use these)</h4>
        <div className="cols-list">
          {cols.map((c) => (
            <span
              key={c}
              className={`chip ${REQUIRED_COLS.includes(c) ? "req" : ""}`}
            >
              {esc(c)}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
