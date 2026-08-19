import { useCallback, useEffect, useState } from "react";
import { api, bustCache } from "../api";
import { esc } from "../utils";
import StatGrid from "./StatGrid";

const fmt = (n) => (n ?? 0).toLocaleString("en-US");

const REQUIRED_COLS = ["team_name", "event_type", "minute"];

function HBar({ label, value, max, sub }) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div className="hbar-row">
      <div className="hbar-label">
        <span className="hbar-name">{esc(label)}</span>
        {sub && <span className="hbar-sub">{esc(sub)}</span>}
      </div>
      <div className="hbar-track">
        <span className="hbar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="hbar-val">{fmt(value)}</div>
    </div>
  );
}

export default function DataDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    setData(null);
    try {
      // Re-profile on every visit so freshly uploaded matches show up.
      bustCache({ command: "data_profile" });
      const d = await api({ command: "data_profile" });
      if (d && d.error) setError(d.error);
      else setData(d);
    } catch (e) {
      setError("Could not load the data profile: " + e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error)
    return (
      <div className="card">
        <h3>Data characteristics</h3>
        <p className="muted">{esc(error)}</p>
        <button
          className="btn small"
          onClick={() => {
            setError("");
            setData(null);
            load();
          }}
        >
          Retry
        </button>
      </div>
    );

  if (!data) return <p className="loading">Building data profile…</p>;

  const maxCompEvents = Math.max(...data.competitions.map((c) => c.events), 1);
  const maxEventType = Math.max(...data.event_types.map((e) => e.count), 1);
  const maxMatchEvents = Math.max(...data.matches.map((m) => m.events), 1);

  const TOP_TYPES = 12;
  const topTypes = data.event_types.slice(0, TOP_TYPES);
  const restCount = data.event_types
    .slice(TOP_TYPES)
    .reduce((s, e) => s + e.count, 0);

  const [rangeStart, rangeEnd] = (data.date_range || []).map((d) =>
    String(d).split("_")[0]
  );

  return (
    <>
      <div className="dash-head">
        <span className="kicker">Dataset profile</span>
        <h2>Data characteristics</h2>
        <p className="muted">
          The full corpus the analysis runs on —{" "}
          {data.total_matches} real matches loaded live,{" "}
          {fmt(data.total_events)} tracked events with xT pre-computed for
          every action.
        </p>
      </div>

      <StatGrid
        stats={[
          { label: "Matches", value: fmt(data.total_matches) },
          { label: "Total events", value: fmt(data.total_events) },
          { label: "Avg events / match", value: fmt(data.avg_events) },
          { label: "Unique teams", value: fmt(data.unique_teams) },
          { label: "Unique players", value: fmt(data.unique_players) },
          { label: "Competitions", value: fmt(data.competitions.length) },
          { label: "Date range", value: `${esc(rangeStart || "-")} → ${esc(rangeEnd || "-")}` },
        ]}
      />

      <div className="cols">
        <div className="card">
          <h3>Matches by competition</h3>
          <p className="muted dash-card-sub">
            Event volume per tournament — each bar is the total across all its
            fixtures.
          </p>
          {data.competitions.map((c) => (
            <HBar
              key={c.name}
              label={c.name}
              value={c.events}
              max={maxCompEvents}
              sub={`${c.matches} match${c.matches === 1 ? "" : "es"}`}
            />
          ))}
        </div>

        <div className="card">
          <h3>Event types</h3>
          <p className="muted dash-card-sub">
            How the corpus is composed — passes dominate, as expected for a
            passing-network study.
          </p>
          {topTypes.map((e) => (
            <HBar
              key={e.type}
              label={e.type}
              value={e.count}
              max={maxEventType}
            />
          ))}
          {restCount > 0 && (
            <p className="muted dash-more">
              + {data.event_types.length - TOP_TYPES} more types,{" "}
              {fmt(restCount)} events combined.
            </p>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Columns &amp; schema</h3>
        <p className="muted dash-card-sub">
          StatsBomb event schema. The three highlighted columns are the minimum
          required to load a match; everything else unlocks deeper analysis.
        </p>
        <div className="cols-list">
          {data.column_coverage.map((c) => (
            <span
              key={c.name}
              className={`chip ${REQUIRED_COLS.includes(c.name) ? "req" : ""}`}
            >
              {esc(c.name)}
              <em>
                {c.matches}/{data.total_matches}m
              </em>
            </span>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Teams in the dataset</h3>
        <p className="muted dash-card-sub">
          Every side appearing in at least one loaded match, with the number of
          fixtures.
        </p>
        <div className="cols-list">
          {data.teams.map((t) => (
            <span key={t.name} className="chip">
              {esc(t.name)}
              <em>
                {t.matches} match{t.matches === 1 ? "" : "es"}
              </em>
            </span>
          ))}
        </div>
      </div>

      <div className="card">
        <h3>Match list</h3>
        <p className="muted dash-card-sub">
          Every fixture with its event and pass volume — bars are relative to
          the busiest match.
        </p>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Competition</th>
              <th>Match</th>
              <th className="num">Events</th>
              <th className="num">Passes</th>
              <th>Event volume</th>
            </tr>
          </thead>
          <tbody>
            {data.matches.map((m) => (
              <tr key={m.date}>
                <td className="num">{esc(m.date_display)}</td>
                <td>{esc(m.competition)}</td>
                <td>
                  {esc(m.home_team)} vs {esc(m.away_team)}
                </td>
                <td className="num">{fmt(m.events)}</td>
                <td className="num">{fmt(m.passes)}</td>
                <td style={{ minWidth: 140 }}>
                  <div className="mini-bar">
                    <span
                      style={{
                        width: `${Math.max(2, (m.events / maxMatchEvents) * 100)}%`,
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
