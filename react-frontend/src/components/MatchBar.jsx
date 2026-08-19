import { useState, useRef } from "react";
import { esc } from "../utils";

export default function MatchBar({
  allMatches,
  selectedMatch,
  teams,
  onMatchChange,
  onMatchesRefresh,
}) {
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploadMsgClass, setUploadMsgClass] = useState("");
  const fileRef = useRef(null);
  const nameRef = useRef(null);

  const COL = (t) => (t === teams?.[0] ? "#3b82f6" : "#ef4444");

  async function doUpload() {
    const f = fileRef.current?.files?.[0];
    if (!f) {
      setUploadMsg("Choose a CSV or Excel file first.");
      setUploadMsgClass("err");
      return;
    }
    const isXlsx = /\.xlsx?$/i.test(f.name);
    setUploadMsg("Uploading " + f.name + "...");
    setUploadMsgClass("");
    try {
      let body;
      if (isXlsx) {
        const buf = new Uint8Array(await f.arrayBuffer());
        let bin = "";
        for (let i = 0; i < buf.length; i += 8192)
          bin += String.fromCharCode.apply(null, buf.subarray(i, i + 8192));
        body = { xlsx_b64: btoa(bin), filename: f.name };
      } else {
        const name =
          nameRef.current?.value.trim() || f.name.replace(/\.csv$/i, "");
        body = { match_name: name, csv_text: await f.text() };
      }
      const r = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (j.error) {
        setUploadMsg("Upload failed: " + j.error);
        setUploadMsgClass("err");
        return;
      }
      const added = j.added || [];
      if (!added.length) {
        setUploadMsg("Nothing added.");
        setUploadMsgClass("err");
        return;
      }
      await onMatchesRefresh(added[0].match_date);
      setUploadMsg(
        `Added ${added.length} match${added.length === 1 ? "" : "es"}: ${added
          .map((a) => a.match_date)
          .join(", ")}.`
      );
      setUploadMsgClass("ok");
    } catch (e) {
      setUploadMsg("Upload error: " + e.message);
      setUploadMsgClass("err");
    }
  }

  return (
    <>
      <section className="bar">
        <label className="bar-field">
          <span className="bar-label">Match</span>
          <select
            value={selectedMatch || ""}
            onChange={(e) => onMatchChange(e.target.value)}
          >
            <option value="">Select a match...</option>
            {(allMatches || []).map((m) => (
              <option key={m.date} value={m.date}>
                {m.home_team} vs {m.away_team} - {m.competition} ({m.date_display})
              </option>
            ))}
          </select>
        </label>
        <label className="bar-field">
          <span className="bar-label">Add your own match(es)</span>
          <span className="upload">
            <input type="file" ref={fileRef} accept=".csv,.xlsx" />
            <input
              type="text"
              ref={nameRef}
              placeholder="name (CSV only)"
            />
            <button className="btn small" onClick={doUpload}>
              Upload
            </button>
          </span>
        </label>
        <div className="legend">
          {teams.map((tm) => (
            <span key={tm}>
              <span className="dot" style={{ background: COL(tm) }}></span>
              {esc(tm)}
            </span>
          ))}
        </div>
      </section>
      {uploadMsg && (
        <div id="uploadMsg" className={`uploadmsg ${uploadMsgClass}`}>
          {uploadMsg}
        </div>
      )}
    </>
  );
}
