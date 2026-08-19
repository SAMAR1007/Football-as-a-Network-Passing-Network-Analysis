// Passing Networks Studio - 6-step front end. Talks to api_server.py /api/predict.

const $ = (s) => document.querySelector(s);
const S = { match: "", info: null, teams: [], step: 1, cache: {} };

async function api(cmd) {
  const key = JSON.stringify(cmd);
  if (S.cache[key]) return S.cache[key];
  const r = await fetch("/api/predict", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: key,
  });
  const j = await r.json();
  S.cache[key] = j;
  return j;
}

const COL = (t) => (t === S.teams[0] ? "#3b82f6" : "#ef4444");
const RGBA = (t, a) => (t === S.teams[0] ? `rgba(59,130,246,${a})` : `rgba(239,68,68,${a})`);
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const n2 = (x) => (x == null ? "-" : Number(x).toFixed(2));
const n1 = (x) => (x == null ? "-" : Number(x).toFixed(1));

// ---------------------------------------------------------------- bootstrap
init();
async function init() {
  await populateMatches();
  const sel = $("#match");
  sel.onchange = () => loadMatch(sel.value, sel.selectedOptions[0]?._m);
  document.querySelectorAll("#steps button").forEach((b) =>
    (b.onclick = () => { if (!b.disabled) setStep(+b.dataset.step); }));
  $("#uploadBtn").onclick = doUpload;
  setStepsEnabled(false);
}

async function populateMatches(selectDate) {
  delete S.cache[JSON.stringify({ command: "matches" })]; // bust so uploads appear
  const d = await api({ command: "matches" });
  S.allMatches = d.matches || [];
  const sel = $("#match");
  sel.innerHTML = '<option value="">Select a match...</option>';
  S.allMatches.forEach((m) => {
    const o = document.createElement("option");
    o.value = m.date;
    o.textContent = `${m.home_team} vs ${m.away_team} - ${m.competition} (${m.date_display})`;
    o._m = m;
    sel.appendChild(o);
  });
  if (selectDate) sel.value = selectDate;
  return S.allMatches;
}

const REQUIRED_COLS = ["team_name", "event_type", "minute"];
function setMsg(t, cls) { const el = $("#uploadMsg"); el.textContent = t; el.className = "uploadmsg " + (cls || ""); }
async function doUpload() {
  const f = $("#csvfile").files[0];
  if (!f) { setMsg("Choose a CSV or Excel file first.", "err"); return; }
  const isXlsx = /\.xlsx?$/i.test(f.name);
  setMsg("Uploading " + f.name + "...", "");
  try {
    let body;
    if (isXlsx) {
      const buf = new Uint8Array(await f.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i += 8192) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 8192));
      body = { xlsx_b64: btoa(bin), filename: f.name };
    } else {
      const name = $("#csvname").value.trim() || f.name.replace(/\.csv$/i, "");
      body = { match_name: name, csv_text: await f.text() };
    }
    const r = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (j.error) { setMsg("Upload failed: " + j.error, "err"); return; }
    const added = j.added || [];
    if (!added.length) { setMsg("Nothing added.", "err"); return; }
    await populateMatches(added[0].match_date);
    setMsg(`Added ${added.length} match${added.length === 1 ? "" : "es"}: ${added.map((a) => a.match_date).join(", ")}. Selected the first below.`, "ok");
    loadMatch(added[0].match_date, S.allMatches.find((m) => m.date === added[0].match_date));
  } catch (e) { setMsg("Upload error: " + e.message, "err"); }
}

async function loadMatch(date, info) {
  S.match = date; S.info = info;
  if (!date) { setStepsEnabled(false); $("#content").innerHTML = '<p class="muted pad">Pick a match above to begin.</p>'; return; }
  const t = await api({ command: "teams", match_date: date });
  S.teams = t.teams || [];
  $("#teams-legend").innerHTML = S.teams.map((tm) =>
    `<span><span class="dot" style="background:${COL(tm)}"></span>${esc(tm)}</span>`).join("");
  setStepsEnabled(true);
  setStep(1);
}

function setStepsEnabled(on) {
  document.querySelectorAll("#steps button").forEach((b) => (b.disabled = !on && +b.dataset.step !== 1));
}
function setStep(n) {
  S.step = n;
  document.querySelectorAll("#steps button").forEach((b) => b.classList.toggle("active", +b.dataset.step === n));
  render();
}

async function render() {
  const c = $("#content");
  c.innerHTML = '<p class="loading">Computing...</p>';
  try {
    const fn = [null, renderLoad, renderNetwork, renderCentrality, renderTactical, renderStory, renderReport][S.step];
    c.innerHTML = await fn();
    if (S.step === 6) { const p = $("#printBtn"); if (p) p.onclick = () => window.print(); }
  } catch (e) {
    c.innerHTML = `<p class="loading">Error: ${esc(e.message)}</p>`;
  }
}

// Expand collapsed hub sections when printing so the full analysis appears
// in the PDF; restore the collapsed state afterwards.
window.addEventListener("beforeprint", function () {
  document.querySelectorAll("details.r-sec:not([open])").forEach(function (d) {
    d.open = true;
    d.setAttribute("data-print-opened", "1");
  });
});
window.addEventListener("afterprint", function () {
  document.querySelectorAll("details.r-sec[data-print-opened]").forEach(function (d) {
    d.open = false;
    d.removeAttribute("data-print-opened");
  });
});

// ---------------------------------------------------------------- helpers
function pitchLines() {
  const s = 'stroke="rgba(255,255,255,.45)" stroke-width="0.4" fill="none"';
  return `<rect x="0" y="0" width="120" height="80" ${s}/>
    <line x1="60" y1="0" x2="60" y2="80" ${s}/><circle cx="60" cy="40" r="9" ${s}/>
    <rect x="0" y="18" width="18" height="44" ${s}/><rect x="102" y="18" width="18" height="44" ${s}/>
    <rect x="0" y="30" width="6" height="20" ${s}/><rect x="114" y="30" width="6" height="20" ${s}/>`;
}
const fy = (y) => y; // StatsBomb y maps straight through (0 at top), matching the in-app lab

function stat(k, v) { return `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`; }

// ---------------------------------------------------------------- STEP 1
async function renderLoad() {
  const m = S.info || {};
  return `<div class="card"><h3>${esc(m.home_team || "")} vs ${esc(m.away_team || "")}</h3>
    <p class="muted">${esc(m.competition || "")} &middot; ${esc(m.date_display || S.match)} &middot; ${m.events || "?"} events</p>
    <div class="statgrid">
      ${stat("Home", esc(m.home_team || "-"))}
      ${stat("Away", esc(m.away_team || "-"))}
      ${stat("Events", m.events || "-")}
      ${stat("Teams", S.teams.length)}
    </div>
    <p class="muted">Move through the six steps above. Every module runs on this match's real event data; steps 2-4 show both teams side by side.</p>
  </div>
  ${columnsCard()}`;
}

function columnsCard() {
  const cols = (S.allMatches && S.allMatches[0] && S.allMatches[0].columns) || REQUIRED_COLS;
  const chips = cols.map((c) => `<span class="chip ${REQUIRED_COLS.includes(c) ? "req" : ""}">${esc(c)}</span>`).join("");
  return `<div class="card"><h3>Add your own match</h3>
    <p class="muted">Use the <b>Upload</b> control in the bar above to add StatsBomb-format event data. A single <code>.csv</code> adds one match; a multi-sheet Excel workbook (<code>.xlsx</code>) adds <b>every sheet as its own match</b>, all at once. The new matches then appear in the dropdown like the built-ins. The three highlighted columns are the minimum required (<code>team_name</code>, <code>event_type</code>, <code>minute</code>); the rest unlock the full analysis (network positions, passes, pressing, xT). If a file has no <code>xt_added</code> column it is filled with 0, so the timeline and verdict still run.</p>
    <h4>Columns (the bundled matches use these)</h4>
    <div class="cols-list">${chips}</div></div>`;
}

// ---------------------------------------------------------------- STEP 2  Network
async function networkSVG(net, team) {
  const maxW = Math.max(1, ...net.edges.map((e) => e.weight));
  const maxInv = Math.max(1, ...net.players.map((p) => p.total_involvement));
  let g = `<svg class="pitch" viewBox="0 0 120 80"><rect x="0" y="0" width="120" height="80" fill="#14361f"/>${pitchLines()}`;
  net.edges.filter((e) => e.weight >= 3).forEach((e) => {
    g += `<line x1="${e.source_x}" y1="${fy(e.source_y)}" x2="${e.target_x}" y2="${fy(e.target_y)}"
      stroke="${RGBA(team, 0.15 + 0.55 * (e.weight / maxW))}" stroke-width="${(0.25 + 1.7 * (e.weight / maxW)).toFixed(2)}"/>`;
  });
  net.players.forEach((p) => {
    const r = 1.6 + 3.2 * (p.total_involvement / maxInv);
    g += `<circle cx="${p.avg_x}" cy="${fy(p.avg_y)}" r="${r.toFixed(2)}" fill="${COL(team)}" stroke="#fff" stroke-width="0.4"/>
      <text x="${p.avg_x}" y="${fy(p.avg_y) - r - 0.6}" text-anchor="middle" font-size="2.4" fill="#fff" style="paint-order:stroke;stroke:#000;stroke-width:.5">${esc(p.nickname || p.name)}</text>`;
  });
  return g + "</svg>";
}

async function renderNetwork() {
  const nets = await Promise.all(S.teams.map((t) => api({ command: "network", match_date: S.match, team: t })));
  const cols = await Promise.all(S.teams.map(async (t, i) => {
    const net = nets[i], m = net.metrics;
    const rows = [...net.players].sort((a, b) => b.total_involvement - a.total_involvement).slice(0, 8).map((p) =>
      `<tr><td>${esc(p.nickname || p.name)}</td><td class="num">${p.passes_made}</td><td class="num">${p.passes_received}</td><td class="num">${n2(p.degree_centrality)}</td></tr>`).join("");
    return `<div class="card"><div class="teamhdr"><span class="dot" style="background:${COL(t)}"></span>${esc(t)}</div>
      ${await networkSVG(net, t)}
      <div class="statgrid">${stat("Density", (m.density * 100).toFixed(0) + "%")}${stat("Hub", esc(m.hub || m.hub_player || "-"))}${stat("Players", m.num_players)}${stat("Connections", m.num_edges)}</div>
      <h4>Most involved</h4>
      <table><tr><th>Player</th><th class="num">Made</th><th class="num">Recv</th><th class="num">Degree</th></tr>${rows}</table>
    </div>`;
  }));
  return `<div class="card"><h3>The passing network</h3><p class="muted">Each dot is a player at their average passing position, sized by involvement; lines are pass combinations (3+), thicker = more used. Density = combinations used / possible; the hub is the most involved player.</p></div>
    <div class="cols">${cols.join("")}</div>`;
}

// ---------------------------------------------------------------- STEP 3  Centrality
async function renderCentrality() {
  const data = await Promise.all(S.teams.map((t) => Promise.all([
    api({ command: "network", match_date: S.match, team: t }),
    api({ command: "tactical", match_date: S.match, team: t }),
  ])));
  const cols = S.teams.map((t, i) => {
    const [net, tac] = data[i];
    const cen = tac.centrality || {};
    const top = (key) => [...net.players].sort((a, b) => (b[key] || 0) - (a[key] || 0))[0];
    const wl = net.weakest_link?.weakest_link || {};
    const cp = cen.centrality_percentage;
    const band = cp == null ? "" : cp < 12 ? "spread evenly" : cp < 18 ? "slight hub" : cp < 25 ? "one/two carry it" : "hub-dependent";
    const rows = [...net.players].sort((a, b) => b.betweenness_centrality - a.betweenness_centrality).slice(0, 8).map((p) =>
      `<tr><td>${esc(p.nickname || p.name)}</td><td class="num">${n2(p.betweenness_centrality)}</td><td class="num">${n2(p.eigenvector_centrality)}</td><td class="num">${n2(p.clustering_coefficient)}</td></tr>`).join("");
    return `<div class="card"><div class="teamhdr"><span class="dot" style="background:${COL(t)}"></span>${esc(t)}</div>
      <div class="statgrid">
        ${stat("Grund centralisation", cp == null ? "-" : cp.toFixed(0) + "%")}
        ${stat("Style", esc(cen.style || "-"))}
        ${stat("Top connector", esc((top("betweenness_centrality") || {}).nickname || "-"))}
        ${stat("Core (eigenvector)", esc((top("eigenvector_centrality") || {}).nickname || "-"))}
      </div>
      <p class="muted" style="font-size:12px">${band ? "Centralisation band: <b>" + band + "</b>." : ""}</p>
      <h4>Centrality (top by betweenness)</h4>
      <table><tr><th>Player</th><th class="num">Between</th><th class="num">Eigen</th><th class="num">Cluster</th></tr>${rows}</table>
      <h4>Weakest link (press target)</h4>
      <div class="stat"><div class="k">${esc(wl.nickname || wl.player || "-")} &middot; score ${n2(wl.weakness_score)}</div>
        <div class="v" style="font-size:12px;font-weight:500;color:var(--muted)">${(wl.reasons || []).map(esc).join(" &middot; ")}</div></div>
    </div>`;
  });
  return `<div class="card"><h3>Centrality &amp; roles</h3><p class="muted">Betweenness = the connector; eigenvector = connected to the well-connected; clustering = tight triangles. Grund centralisation shows how much the passing leans on one hub; the weakest link is the man to press.</p></div>
    <div class="cols">${cols.join("")}</div>`;
}

// ---------------------------------------------------------------- STEP 4  Tactical
function heatmapSVG(zones) {
  const max = Math.max(1, ...zones.map((z) => z.count));
  let g = `<svg class="pitch" viewBox="0 0 120 80"><rect x="0" y="0" width="120" height="80" fill="#14361f"/>`;
  zones.forEach((z) => {
    const x = z.col * 24, y = z.row * 16, inten = z.count / max;
    g += `<rect x="${x}" y="${y}" width="24" height="16" fill="rgba(99,102,241,${(0.08 + 0.82 * inten).toFixed(2)})" stroke="rgba(255,255,255,.2)" stroke-width="0.3"/>
      <text x="${x + 12}" y="${y + 9}" text-anchor="middle" font-size="3" fill="#fff" style="paint-order:stroke;stroke:#000;stroke-width:.5">${z.count || ""}</text>`;
  });
  return g + pitchLines() + "</svg>";
}
// Direction sonar: the engine's 8-way compass counts, drawn as an 8-point radar
// with FORWARD at the top (clockwise), exactly like the in-app lab.
function sonarSVG(counts, team) {
  const LABELS = ["forward", "forward_right", "right", "back_right", "back", "back_left", "left", "forward_left"];
  const ANGLES = [270, 315, 0, 45, 90, 135, 180, 225];
  counts = counts || {};
  const max = Math.max(1, ...LABELS.map((l) => counts[l] || 0));
  const cx = 50, cy = 50, R = 30;
  const pts = LABELS.map((l, i) => {
    const a = ANGLES[i] * Math.PI / 180, r = ((counts[l] || 0) / max) * R;
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
  }).join(" ");
  let g = `<svg viewBox="0 0 100 100" style="width:100%;max-width:260px;display:block;margin:0 auto">`;
  [0.25, 0.5, 0.75, 1].forEach((f) => (g += `<circle cx="${cx}" cy="${cy}" r="${(R * f).toFixed(1)}" fill="none" stroke="var(--line)" stroke-width="0.4"/>`));
  ANGLES.forEach((a) => {
    const rad = a * Math.PI / 180;
    g += `<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(rad) * R).toFixed(1)}" y2="${(cy + Math.sin(rad) * R).toFixed(1)}" stroke="var(--line)" stroke-width="0.35"/>`;
  });
  g += `<polygon points="${pts}" fill="${RGBA(team, 0.35)}" stroke="${COL(team)}" stroke-width="1"/>`;
  LABELS.forEach((l, i) => {
    const rad = ANGLES[i] * Math.PI / 180, lr = R + 9;
    g += `<text x="${(cx + Math.cos(rad) * lr).toFixed(1)}" y="${(cy + Math.sin(rad) * lr).toFixed(1)}" text-anchor="middle" dominant-baseline="middle" font-size="3.1" fill="var(--muted)">${l.replace("_", " ")}</text>`;
  });
  return g + `</svg>`;
}
function shape(net) {
  const P = net.players;
  const ys = P.map((p) => p.avg_y), xs = P.map((p) => p.avg_x);
  const width = Math.max(...ys) - Math.min(...ys), depth = Math.max(...xs) - Math.min(...xs);
  let sum = 0, cnt = 0;
  for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
    sum += Math.hypot(P[i].avg_x - P[j].avg_x, P[i].avg_y - P[j].avg_y); cnt++;
  }
  const comp = cnt ? 100 / (sum / cnt) : 0;
  return { width, depth, comp };
}
async function renderTactical() {
  const cmp = await api({ command: "compare", match_date: S.match });
  const data = await Promise.all(S.teams.map((t) => Promise.all([
    api({ command: "tactical_map", match_date: S.match, team: t }),
    api({ command: "insights", match_date: S.match, team: t }),
    api({ command: "zone_connections", match_date: S.match, team: t }),
    api({ command: "network", match_date: S.match, team: t }),
  ])));
  const cols = S.teams.map((t, i) => {
    const [tm, ins, zc, net] = data[i];
    const c = (cmp.teams || {})[t] || {};
    const ppda = c.ppda?.ppda, tilt = c.field_tilt?.field_tilt;
    const sh = shape(net);
    const tot = zc.progressive_passes + zc.regressive_passes + zc.lateral_passes || 1;
    return `<div class="card"><div class="teamhdr"><span class="dot" style="background:${COL(t)}"></span>${esc(t)}</div>
      <div class="statgrid">
        ${stat("PPDA", ppda == null ? "-" : n1(ppda))}
        ${stat("Field tilt", tilt == null ? "-" : tilt.toFixed(0) + "%")}
        ${stat("Progressive", Math.round(100 * zc.progressive_passes / tot) + "%")}
        ${stat("Shape W/D", sh.width.toFixed(0) + " / " + sh.depth.toFixed(0))}
      </div>
      <h4>25-zone passing map (attacking &rarr;)</h4>${heatmapSVG(tm.zones)}
      <h4>Direction sonar</h4>${sonarSVG(ins.pass_directions && ins.pass_directions.counts, t)}
      <h4>Zone flow</h4>
      <div class="statgrid">${stat("Progressive", zc.progressive_passes)}${stat("Lateral", zc.lateral_passes)}${stat("Regressive", zc.regressive_passes)}</div>
    </div>`;
  });
  return `<div class="card"><h3>Tactical geography</h3><p class="muted">Where each team plays and how hard it presses. PPDA: lower = more aggressive. Field tilt: share of all final-third passes. The 25-zone map colours by pass volume; the sonar shows passing direction (forward points up).</p></div>
    <div class="cols">${cols.join("")}</div>`;
}

// ---------------------------------------------------------------- STEP 5  Match story
function verdictCard(v) {
  const js = v.justice_score || 0;
  return `<div class="verdict">
    <div class="score">${esc(v.score || "")} <span class="muted" style="font-size:16px">${esc(v.winner || "")}</span></div>
    <div class="headline">${esc(v.verdict_headline || "")}</div>
    <div style="margin:10px 0"><div class="muted" style="font-size:12px">Justice score ${js}/100</div><div class="bar-h"><span style="width:${js}%"></span></div></div>
    <p>${esc(v.narrative || "")}</p></div>`;
}
function goalPitch(g) {
  let s = `<svg class="pitch" viewBox="0 0 120 80" style="max-height:160px"><rect x="0" y="0" width="120" height="80" fill="#14361f"/>${pitchLines()}`;
  (g.buildup_sequence || []).forEach((ev) => {
    if (ev.end_x == null) return;
    const good = (ev.xt_added || 0) >= 0;
    s += `<line x1="${ev.x}" y1="${fy(ev.y)}" x2="${ev.end_x}" y2="${fy(ev.end_y)}" stroke="${good ? "#22c55e" : "#94a3b8"}" stroke-width="0.8" opacity="0.9"/>
      <circle cx="${ev.x}" cy="${fy(ev.y)}" r="0.8" fill="#fff"/>`;
  });
  s += `<circle cx="${g.x}" cy="${fy(g.y)}" r="1.8" fill="#fbbf24" stroke="#000" stroke-width="0.4"/></svg>`;
  return `<div class="card"><div class="teamhdr"><span class="dot" style="background:${COL(g.team)}"></span>${esc(g.scorer)} &middot; ${g.minute}'</div>
    <p class="muted" style="font-size:12px">xG ${n2(g.xg)} &middot; build-up xT ${n2(g.buildup_xt)} over ${g.buildup_events} events</p>${s}</div>`;
}
async function renderStory() {
  const [tl, goals] = await Promise.all([
    api({ command: "timeline", match_date: S.match }),
    api({ command: "goals", match_date: S.match }),
  ]);
  const shots = await Promise.all(S.teams.map((t) => api({ command: "shots", match_date: S.match, team: t })));
  // timeline strip: each period coloured by possession leader, height by that possession
  const strip = (tl.periods || []).map((p) => {
    let lead = S.teams[0], best = -1;
    S.teams.forEach((t) => { const q = p.teams?.[t]?.possession ?? 0; if (q > best) { best = q; lead = t; } });
    return `<div class="seg" title="${p.label}: ${lead} ${best.toFixed(0)}%" style="height:${20 + 0.8 * best}%;background:${COL(lead)}"></div>`;
  }).join("");
  const shifts = tl.insights?.momentum_shifts?.length ?? 0;
  const shotTables = S.teams.map((t, i) => {
    const rows = (shots[i].players || []).slice(0, 6).map((p) =>
      `<tr><td>${esc(p.nickname || p.player)}</td><td class="num">${p.shots}</td><td class="num">${p.goals}</td><td class="num">${n2(p.xg)}</td><td class="num" style="color:${p.xg_difference >= 0 ? "var(--good)" : "var(--bad)"}">${p.xg_difference >= 0 ? "+" : ""}${n2(p.xg_difference)}</td></tr>`).join("");
    return `<div class="card"><div class="teamhdr"><span class="dot" style="background:${COL(t)}"></span>${esc(t)} shots</div>
      <table><tr><th>Player</th><th class="num">Sh</th><th class="num">G</th><th class="num">xG</th><th class="num">xG diff</th></tr>${rows}</table></div>`;
  }).join("");
  return `<div class="card"><h3>The match story &amp; verdict</h3>${verdictCard(tl.verdict || {})}</div>
    <div class="card"><h4>Timeline (5-minute windows, coloured by who led)</h4>
      <div class="timeline-strip">${strip}</div>
      <p class="muted" style="font-size:12px;margin-top:8px">${shifts} momentum shift${shifts === 1 ? "" : "s"} across the match.</p></div>
    <div class="card"><h3>Goals - build-up xT trails</h3><div class="cols">${(goals.goals || []).map(goalPitch).join("") || '<p class="muted">No goals in the data.</p>'}</div></div>
    <div class="cols">${shotTables}</div>`;
}

// ---------------------------------------------------------------- STEP 6  Report
async function renderReport() {
  // Fetch everything the five analysis steps need, so the report (and the
  // print) contains the full analysis, not just a summary.
  const [cmp, tl, goals] = await Promise.all([
    api({ command: "compare", match_date: S.match }),
    api({ command: "timeline", match_date: S.match }),
    api({ command: "goals", match_date: S.match }),
  ]);
  const per = await Promise.all(S.teams.map((t) => Promise.all([
    api({ command: "network", match_date: S.match, team: t }),
    api({ command: "tactical", match_date: S.match, team: t }),
    api({ command: "tactical_map", match_date: S.match, team: t }),
    api({ command: "insights", match_date: S.match, team: t }),
    api({ command: "zone_connections", match_date: S.match, team: t }),
    api({ command: "shots", match_date: S.match, team: t }),
  ])));
  const m = S.info || {}, v = tl.verdict || {};

  // 2. Networks
  const netCards = (await Promise.all(S.teams.map(async (t, i) => {
    const net = per[i][0], mm = net.metrics;
    const rows = [...net.players].sort((a, b) => b.total_involvement - a.total_involvement).slice(0, 6).map((p) =>
      `<tr><td>${esc(p.nickname || p.name)}</td><td class="num">${p.passes_made}</td><td class="num">${p.passes_received}</td><td class="num">${n2(p.degree_centrality)}</td></tr>`).join("");
    return `<div class="card"><div class="teamhdr"><span class="dot" style="background:${COL(t)}"></span>${esc(t)}</div>
      ${await networkSVG(net, t)}
      <div class="statgrid">${stat("Density", (mm.density * 100).toFixed(0) + "%")}${stat("Hub", esc(mm.hub || mm.hub_player || "-"))}${stat("Players", mm.num_players)}${stat("Links", mm.num_edges)}</div>
      <table><tr><th>Player</th><th class="num">Made</th><th class="num">Recv</th><th class="num">Degree</th></tr>${rows}</table></div>`;
  }))).join("");

  // 3. Centrality
  const cenCards = S.teams.map((t, i) => {
    const net = per[i][0], cen = (per[i][1].centrality) || {}, wl = net.weakest_link?.weakest_link || {};
    const rows = [...net.players].sort((a, b) => b.betweenness_centrality - a.betweenness_centrality).slice(0, 6).map((p) =>
      `<tr><td>${esc(p.nickname || p.name)}</td><td class="num">${n2(p.betweenness_centrality)}</td><td class="num">${n2(p.eigenvector_centrality)}</td><td class="num">${n2(p.clustering_coefficient)}</td></tr>`).join("");
    return `<div class="card"><div class="teamhdr"><span class="dot" style="background:${COL(t)}"></span>${esc(t)}</div>
      <div class="statgrid">${stat("Grund", cen.centrality_percentage == null ? "-" : cen.centrality_percentage.toFixed(0) + "%")}${stat("Style", esc(cen.style || "-"))}${stat("Weakest link", esc(wl.nickname || wl.player || "-"))}</div>
      <table><tr><th>Player</th><th class="num">Between</th><th class="num">Eigen</th><th class="num">Cluster</th></tr>${rows}</table>
      <p class="muted" style="font-size:12px">${(wl.reasons || []).map(esc).join(" &middot; ")}</p></div>`;
  }).join("");

  // 4. Tactical
  const tacCards = S.teams.map((t, i) => {
    const net = per[i][0], tm = per[i][2], ins = per[i][3], zc = per[i][4];
    const c = (cmp.teams || {})[t] || {}, sh = shape(net);
    return `<div class="card"><div class="teamhdr"><span class="dot" style="background:${COL(t)}"></span>${esc(t)}</div>
      <div class="statgrid">${stat("PPDA", c.ppda?.ppda == null ? "-" : n1(c.ppda.ppda))}${stat("Field tilt", c.field_tilt?.field_tilt == null ? "-" : c.field_tilt.field_tilt.toFixed(0) + "%")}${stat("Shape W/D", sh.width.toFixed(0) + "/" + sh.depth.toFixed(0))}${stat("Progressive", zc.progressive_passes)}</div>
      <h4>25-zone map</h4>${heatmapSVG(tm.zones)}<h4>Direction sonar</h4>${sonarSVG(ins.pass_directions && ins.pass_directions.counts, t)}</div>`;
  }).join("");

  // 5. Match story
  const strip = (tl.periods || []).map((p) => {
    let lead = S.teams[0], best = -1;
    S.teams.forEach((t) => { const q = p.teams?.[t]?.possession ?? 0; if (q > best) { best = q; lead = t; } });
    return `<div class="seg" title="${p.label}" style="height:${20 + 0.8 * best}%;background:${COL(lead)}"></div>`;
  }).join("");
  const shotCards = S.teams.map((t, i) => {
    const rows = (per[i][5].players || []).slice(0, 6).map((p) =>
      `<tr><td>${esc(p.nickname || p.player)}</td><td class="num">${p.shots}</td><td class="num">${p.goals}</td><td class="num">${n2(p.xg)}</td><td class="num" style="color:${p.xg_difference >= 0 ? "var(--good)" : "var(--bad)"}">${p.xg_difference >= 0 ? "+" : ""}${n2(p.xg_difference)}</td></tr>`).join("");
    return `<div class="card"><div class="teamhdr"><span class="dot" style="background:${COL(t)}"></span>${esc(t)} shots</div>
      <table><tr><th>Player</th><th class="num">Sh</th><th class="num">G</th><th class="num">xG</th><th class="num">xG diff</th></tr>${rows}</table></div>`;
  }).join("");

  // ---------- helper: direction bar ----------
  function dirBar(fwd, back, lat) {
    const tot = fwd + back + lat || 1;
    return `<div class="dir-bar"><div class="dir-bar-fill dir-fwd" style="width:${(fwd/tot*100).toFixed(0)}%"></div><div class="dir-bar-fill dir-lat" style="width:${(lat/tot*100).toFixed(0)}%"></div><div class="dir-bar-fill dir-back" style="width:${(back/tot*100).toFixed(0)}%"></div></div>`;
  }

  // ---------- helper: interval heat ----------
  function intervalChart(intervals) {
    if (!intervals || !intervals.length) return '';
    const maxP = Math.max(1, ...intervals.map(i => i.passes));
    return `<div class="int-chart">${intervals.map(i => 
      `<div class="int-bar" title="${i.label}: ${i.passes} passes, ${i.accuracy}% acc">
        <div class="int-fill" style="height:${(i.passes/maxP*100).toFixed(0)}%"></div>
        <div class="int-label">${i.label}</div>
      </div>`
    ).join('')}</div>`;
  }

  // Hub player tactical analysis (enhanced with full tactical report)
  const hubCards = (await Promise.all(S.teams.map(async (t, i) => {
    const opp = S.teams[1 - i];
    const hub = await api({ command: "hub_tactical", match_date: S.match, team: opp });
    if (!hub || hub.error) return '';
    const h = hub.hub_player;
    const ctx = hub.team_context;
    const dps = h.metrics;
    const tr = hub.tactical_report || {};
    const dpa = hub.detailed_passing_analysis || {};
    const pb = hub.period_breakdown || {};
    const lua = hub.link_up_analysis || {};
    const xtd = hub.xt_deep_dive || {};

    const domClass = ctx.hub_dominance === 'high' ? 'b-warn' : ctx.hub_dominance === 'medium' ? 'b-info' : 'b-good';
    const badgeHtml = (b) => `<span class="badge b-${b}" style="font-size:10px;margin-left:6px">${b}</span>`;

    // ----- Strengths -----
    const strRows = hub.strengths.map((s) =>
      `<div class="stat" style="font-size:12px;padding:6px 10px;border-left:3px solid var(--good)">
        <div style="display:flex;align-items:center;gap:4px;font-weight:600">${esc(s.type.replace(/_/g, ' '))}${badgeHtml(s.badge)}</div>
        <div style="color:var(--muted);font-size:11px;margin-top:2px">${esc(s.message)}</div>
      </div>`).join('');

    // ----- Weaknesses -----
    const wRows = hub.weaknesses.map((w) => {
      const sevBadge = w.severity === 'high' ? 'b-bad' : w.severity === 'medium' ? 'b-warn' : 'b-info';
      return `<div class="stat" style="font-size:12px;padding:6px 10px;border-left:3px solid var(--bad)">
        <div style="display:flex;align-items:center;gap:4px;font-weight:600">${esc(w.type.replace(/_/g, ' '))}<span class="badge ${sevBadge}">${w.severity}</span></div>
        <div style="color:var(--muted);font-size:11px;margin-top:2px">${esc(w.message)}</div>
      </div>`;
    }).join('');

    // ----- Mitigation strategies -----
    const typeColors = {man_marking:'#f59e0b',pressing:'#ef4444',positional:'#3b82f6',double_team:'#8b5cf6',interception:'#22c55e',psychological:'#6366f1'};
    const mitRows = (hub.mitigation_strategies || []).map((m) => {
      const sevBadge = m.severity === 'high' ? 'b-bad' : m.severity === 'medium' ? 'b-warn' : 'b-info';
      return `<div class="stat" style="font-size:12px;padding:8px 10px;border-left:3px solid ${typeColors[m.type] || 'var(--accent)'}">
        <div style="display:flex;align-items:center;gap:6px;font-weight:600">
          <span style="font-size:10px;color:${typeColors[m.type] || 'var(--accent)'}">\u25CF</span>
          ${esc(m.title)}
          <span class="badge ${sevBadge}">${m.severity}</span>
        </div>
        <div style="color:var(--muted);font-size:11px;margin-top:3px">${esc(m.text)}</div>
      </div>`;
    }).join('') || '<p class="muted" style="font-size:12px">No specific mitigation strategies generated.</p>';

    // ----- Passing direction breakdown -----
    const dir = h.pass_direction_breakdown || {};
    const dist = h.pass_distance_breakdown || {};
    const zon = h.zone_breakdown || {};
    const zonesHtml = (zon.top_zones || []).map(z => 
      `<span class="chip">${esc(z.label)}: ${z.passes} passes (${z.accuracy}%)</span>`
    ).join('') || '<span class="chip">No zone data</span>';

    // ----- Period breakdown -----
    const fh = pb.first_half || {};
    const sh = pb.second_half || {};
    const intHtml = pb.has_data ? `<div class="h-per">
      <div class="statgrid" style="grid-template-columns:1fr 1fr;gap:6px">
        <div class="stat"><div class="k">1st half</div><div class="v" style="font-size:15px">${fh.passes || 0} passes &middot; ${fh.accuracy || 0}%</div></div>
        <div class="stat"><div class="k">2nd half</div><div class="v" style="font-size:15px">${sh.passes || 0} passes &middot; ${sh.accuracy || 0}%</div></div>
      </div>
      <p class="muted" style="font-size:11px">${fh.passes > 0 && sh.passes > 0 ? `Forward: ${fh.forward_pct||0}% (1st) vs ${sh.forward_pct||0}% (2nd)` : ''}</p>
      <h5 style="font-size:10px;margin:8px 0 4px;color:var(--muted);text-transform:uppercase">15-min intervals</h5>
      ${intervalChart(pb.intervals)}
    </div>` : '<p class="muted" style="font-size:12px">No period data available.</p>';

    // ----- Link-up analysis -----
    const partnerRows = (lua.top_partners || []).map(p => 
      `<tr><td>${esc(p.nickname)}</td><td class="num">${p.passes_to}</td><td class="num">${p.passes_from}</td><td class="num">${p.total_exchanges}</td></tr>`
    ).join('') || '<tr><td colspan="4" class="muted">No link-up data</td></tr>';

    // ----- xT deep dive -----
    const xtHtml = xtd.has_data ? `<div class="statgrid" style="grid-template-columns:repeat(3,1fr);gap:6px">
      <div class="stat"><div class="k">Total xT</div><div class="v" style="font-size:15px">${n2(xtd.total_xt)}</div></div>
      <div class="stat"><div class="k">xT per pass</div><div class="v" style="font-size:15px">${n2(xtd.xt_per_pass)}</div></div>
      <div class="stat"><div class="k">Pos/Neg passes</div><div class="v" style="font-size:15px">${xtd.positive_xt_passes}/${xtd.negative_xt_passes}</div></div>
    </div><div class="xt-phase">
      ${xtd.xt_by_phase ? Object.entries(xtd.xt_by_phase).map(([k,v]) => 
        `<span class="chip">${esc(k)}: ${n2(v)}</span>`
      ).join('') : ''}
    </div>` : '<p class="muted" style="font-size:12px">No xT data available for this match.</p>';

    // ----- Tactical report sections -----
    const reportSections = [
      {title: 'Executive summary', body: tr.executive_summary, icon: '\uD83D\udcca'},
      {title: 'Role analysis', body: tr.role_analysis, icon: '\uD83D\udc64'},
      {title: 'Spatial influence', body: tr.spatial_influence, icon: '\uD83D\uddfa\uFE0F'},
      {title: 'Temporal pattern', body: tr.temporal_pattern, icon: '\u23F1\uFE0F'},
    ];
    const htmlReportSections = reportSections.filter(s => s.body).map(s => 
      `<details class="r-sec" ${s.title === 'Executive summary' ? 'open' : ''}>
        <summary><span class="r-icon">${s.icon}</span> ${s.title}</summary>
        <div class="r-body">${esc(s.body)}</div>
      </details>`
    ).join('');

    // ----- Exploitation guide -----
    const exploitLines = (tr.exploitation_guide || '').split('\n').filter(l => l.trim());
    const exploitHtml = exploitLines.length > 0 
      ? `<ul class="exploit-list">${exploitLines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>`
      : '';

    // ----- Key battles -----
    const battlesHtml = tr.key_battles 
      ? `<div class="r-body" style="font-size:12px">${esc(tr.key_battles)}</div>`
      : '';

    const hasStr = hub.strengths.length > 0;
    const hasWk = hub.weaknesses.length > 0;

    return `<div class="card hub-card">
      <div class="teamhdr"><span class="dot" style="background:${COL(t)}"></span>How ${esc(t)} should contain <b>${esc(opp)}</b></div>
      
      <!-- Player profile header -->
      <div class="hub-header">
        <div class="hub-header-main">
          <div class="hub-name">${esc(h.nickname)}</div>
          <span class="badge ${domClass}">${esc(ctx.hub_dominance.toUpperCase())} IMPACT</span>
          <span class="hub-pos">${esc(h.position)} &middot; x=${h.avg_x.toFixed(0)} y=${h.avg_y.toFixed(0)}</span>
        </div>
        <div class="hub-stats-row">
          <div class="hub-stat"><span class="hub-stat-v">${dps.total_involvement}</span><span class="hub-stat-l">Involvements</span></div>
          <div class="hub-stat"><span class="hub-stat-v">${dps.passes_made}/${dps.passes_received}</span><span class="hub-stat-l">Made/Recv</span></div>
          <div class="hub-stat"><span class="hub-stat-v">${n1(dps.degree_centrality)}</span><span class="hub-stat-l">Degree</span></div>
          <div class="hub-stat"><span class="hub-stat-v">${n2(dps.betweenness_centrality)}</span><span class="hub-stat-l">Betweenness</span></div>
          <div class="hub-stat"><span class="hub-stat-v">${dps.xt_generated != null ? n2(dps.xt_generated) : '-'}</span><span class="hub-stat-l">xT</span></div>
          <div class="hub-stat"><span class="hub-stat-v">${dps.forward_pass_pct}%</span><span class="hub-stat-l">Fwd %</span></div>
        </div>
        <p class="hub-narrative">${esc(hub.narrative)}</p>
      </div>

      <!-- Passing analysis grid -->
      <div class="hub-grid">
        <div class="hub-section">
          <h4 class="hub-sec-title">\uD83D\udc4B Passing direction</h4>
          <div class="statgrid" style="grid-template-columns:1fr 1fr 1fr;gap:4px">
            <div class="stat"><div class="k" style="color:var(--good)">Forward</div><div class="v" style="font-size:14px">${dir.forward_pct || 0}%</div></div>
            <div class="stat"><div class="k" style="color:var(--warn)">Lateral</div><div class="v" style="font-size:14px">${dir.lateral_pct || 0}%</div></div>
            <div class="stat"><div class="k" style="color:var(--bad)">Backward</div><div class="v" style="font-size:14px">${dir.backward_pct || 0}%</div></div>
          </div>
          ${dirBar(dir.forward_count||0, dir.backward_count||0, dir.lateral_count||0)}
        </div>
        <div class="hub-section">
          <h4 class="hub-sec-title">\uD83D\udccf Pass distance</h4>
          <div class="statgrid" style="grid-template-columns:1fr 1fr 1fr;gap:4px">
            <div class="stat"><div class="k">Short</div><div class="v" style="font-size:14px">${dist.short_pct || 0}%</div></div>
            <div class="stat"><div class="k">Medium</div><div class="v" style="font-size:14px">${dist.medium_pct || 0}%</div></div>
            <div class="stat"><div class="k">Long</div><div class="v" style="font-size:14px">${dist.long_pct || 0}%</div></div>
          </div>
          <p class="muted" style="font-size:11px;margin-top:4px">Avg distance: ${dist.avg_distance || 0}m</p>
        </div>
        <div class="hub-section">
          <h4 class="hub-sec-title">\uD83C\udf0d Build-up phase</h4>
          <div class="statgrid" style="grid-template-columns:1fr 1fr 1fr;gap:4px">
            <div class="stat"><div class="k">Defensive</div><div class="v" style="font-size:14px">${zon.defensive_third_pct || 0}%</div></div>
            <div class="stat"><div class="k">Middle</div><div class="v" style="font-size:14px">${zon.middle_third_pct || 0}%</div></div>
            <div class="stat"><div class="k">Attacking</div><div class="v" style="font-size:14px">${zon.attacking_third_pct || 0}%</div></div>
          </div>
          <p class="muted" style="font-size:11px;margin-top:4px">Primary phase: ${esc(zon.primary_phase || 'N/A')}</p>
        </div>
        <div class="hub-section">
          <h4 class="hub-sec-title">\uD83C\udfaf Top zones</h4>
          <div class="zones-list">${zonesHtml}</div>
        </div>
      </div>

      <!-- Accuracy card -->
      <div class="acc-card">
        <div class="statgrid" style="grid-template-columns:1fr 1fr 1fr 1fr;gap:6px">
          <div class="stat"><div class="k">Overall accuracy</div><div class="v" style="font-size:15px">${h.pressure_stats?.normal_accuracy || 0}%</div></div>
          <div class="stat"><div class="k">Under pressure</div><div class="v" style="font-size:15px;color:${(h.pressure_stats?.accuracy_drop || 0) > 10 ? 'var(--bad)' : 'var(--good)'}">${h.pressure_stats?.pressure_accuracy != null ? h.pressure_stats.pressure_accuracy + '%' : 'N/A'}</div></div>
          <div class="stat"><div class="k">Accuracy drop</div><div class="v" style="font-size:15px;color:${(h.pressure_stats?.accuracy_drop || 0) > 10 ? 'var(--bad)' : 'var(--good)'}">${h.pressure_stats?.accuracy_drop != null ? h.pressure_stats.accuracy_drop + 'pp' : 'N/A'}</div></div>
          <div class="stat"><div class="k">Pressure situations</div><div class="v" style="font-size:15px">${h.pressure_stats?.passes_under_pressure || 0}</div></div>
        </div>
      </div>

      <!-- Period breakdown -->
      <details class="r-sec">
        <summary><span class="r-icon">\uD83D\udcc5</span> Match progression &amp; period breakdown</summary>
        ${intHtml}
      </details>

      <!-- Link-up analysis -->
      <details class="r-sec">
        <summary><span class="r-icon">\uD83E\udd1D</span> Link-up analysis</summary>
        <div class="h-per">
          <p class="muted" style="font-size:11px;margin-bottom:6px">${lua.total_connections || 0} total connections. Primary partnerships:</p>
          <table><tr><th>Player</th><th class="num">To</th><th class="num">From</th><th class="num">Total</th></tr>${partnerRows}</table>
        </div>
      </details>

      <!-- xT deep dive -->
      <details class="r-sec">
        <summary><span class="r-icon">\u26A1</span> Expected Threat (xT) deep dive</summary>
        <div class="h-per">${xtHtml}</div>
      </details>

      <!-- Strengths & Weaknesses -->
      <div class="hub-grid">
        <div class="hub-section">
          <h4 style="margin:0 0 6px;color:var(--good)">\u2705 Strengths ${hasStr ? '' : '<span class="muted" style="font-weight:400;font-size:11px;text-transform:none">(none identified)</span>'}</h4>
          ${hasStr ? `<div style="display:flex;flex-direction:column;gap:5px">${strRows}</div>` : '<p class="muted" style="font-size:12px">No notable strengths detected.</p>'}
        </div>
        <div class="hub-section">
          <h4 style="margin:0 0 6px;color:var(--bad)">\u26A0\uFE0F Weaknesses ${hasWk ? '' : '<span class="muted" style="font-weight:400;font-size:11px;text-transform:none">(none identified)</span>'}</h4>
          ${hasWk ? `<div style="display:flex;flex-direction:column;gap:5px">${wRows}</div>` : '<p class="muted" style="font-size:12px">No exploitable weaknesses found.</p>'}
        </div>
      </div>

      <!-- Tactical report -->
      <h4 style="margin:12px 0 8px">\uD83D\udcdd Tactical scouting report</h4>
      <div class="report-sections">${htmlReportSections}</div>

      <!-- Mitigation strategies -->
      <h4 style="margin:12px 0 8px">\uD83D\udd27 Tactical recommendations to minimise their impact</h4>
      <div style="display:flex;flex-direction:column;gap:6px">${mitRows}</div>

      <!-- Exploitation guide -->
      ${exploitHtml ? `<details class="r-sec">
        <summary><span class="r-icon">\uD83C\udfaf</span> Opposition exploitation guide</summary>
        ${exploitHtml}
      </details>` : ''}

      <!-- Key battles -->
      ${battlesHtml ? `<details class="r-sec">
        <summary><span class="r-icon">\u2694\uFE0F</span> Key battles to watch</summary>
        ${battlesHtml}
      </details>` : ''}

    </div>`;
  }))).join('');

  // head to head
  const h2h = S.teams.map((t, i) => {
    const c = (cmp.teams || {})[t] || {}, mm = per[i][0].metrics, wl = per[i][0].weakest_link?.weakest_link || {};
    return `<tr><td><span class="dot" style="background:${COL(t)}"></span>${esc(t)}</td><td class="num">${c.passes ?? "-"}</td><td class="num">${(mm.density * 100).toFixed(0)}%</td><td>${esc(mm.hub || mm.hub_player || "-")}</td><td class="num">${c.ppda?.ppda == null ? "-" : n1(c.ppda.ppda)}</td><td class="num">${c.field_tilt?.field_tilt == null ? "-" : c.field_tilt.field_tilt.toFixed(0) + "%"}</td><td class="num">${n2(c.xt)}</td><td>${esc(wl.nickname || "-")}</td></tr>`;
  }).join("");

  return `<div class="card"><h3 style="display:flex;justify-content:space-between;align-items:center;gap:12px">Full report - the complete analysis
    <button id="printBtn" class="btn">Print / Save as PDF</button></h3>
    <p><b>${esc(m.home_team)} vs ${esc(m.away_team)}</b> - ${esc(m.competition)}, ${esc(m.date_display || S.match)}.</p></div>
    <div class="card"><h4>1. Executive summary</h4>${verdictCard(v)}
      <table style="margin-top:12px"><tr><th>Team</th><th class="num">Passes</th><th class="num">Density</th><th>Hub</th><th class="num">PPDA</th><th class="num">Field tilt</th><th class="num">xT</th><th>Weakest link</th></tr>${h2h}</table></div>
    <div class="card"><h4>2. Passing networks</h4><div class="cols">${netCards}</div></div>
    <div class="card"><h4>3. Centrality &amp; roles</h4><div class="cols">${cenCards}</div></div>
    <div class="card"><h4>4. Tactical geography</h4><div class="cols">${tacCards}</div></div>
    <div class="card"><h4>5. Match story</h4>
      <div class="timeline-strip">${strip}</div>
      <h4>Goals - build-up xT trails</h4><div class="cols">${(goals.goals || []).map(goalPitch).join("") || '<p class="muted">No goals in the data.</p>'}</div>
      <div class="cols">${shotCards}</div></div>
    <div class="card"><h4>6. Hub player tactical analysis</h4><div class="cols">${hubCards}</div></div>
    <div class="card"><h4>7. How to read it</h4><p class="muted">The verdict's justice score (25 + 18.75 per metric the winner led, out of xG / xT / possession / passes) says how well the result matched the balance of play. A dominant network (high density, distributed hub) with strong pressing (low PPDA) and territory (high field tilt) that agrees with the scoreline is a deserved win; when they disagree, it is a smash-and-grab.</p></div>`;
}
