// Temporary diagnostic: open the report and inspect tactical + hub sections.
const DEBUG = "http://127.0.0.1:9222";
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const tab = await (await fetch(`${DEBUG}/json/new?${encodeURIComponent("about:blank")}`, { method: "PUT" })).json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);
let msgId = 0;
const pending = new Map();
const issues = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else if (m.method === "Runtime.exceptionThrown") {
    issues.push("EXC: " + (m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || "").slice(0, 300));
  } else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
    issues.push("CONSOLE: " + (m.params.args || []).map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 300));
  }
};
await new Promise((res) => (ws.onopen = res));

function send(method, params = {}) {
  return new Promise((res) => {
    const id = ++msgId;
    pending.set(id, res);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evalJs(expression) {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) {
    return "EVAL_ERR: " + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text || "").slice(0, 200);
  }
  return r.result?.result?.value;
}

await send("Page.enable");
await send("Runtime.enable");
await send("Page.navigate", { url: "http://localhost:8000/" });
await sleep(4500);

const clickText = (t) =>
  `(() => { const b = [...document.querySelectorAll('button,a')].find(x => x.textContent.includes(${JSON.stringify(t)})); if (!b) return 'NOT FOUND'; b.click(); return 'clicked'; })()`;

console.log("START:", await evalJs(clickText("Start analysing")));
await sleep(2500);

console.log("OPTIONS:", await evalJs(`[...document.querySelectorAll('.bar select option')].slice(0,8).map(o => o.value + ' | ' + o.textContent)`));
console.log("SELECT:", await evalJs(`(() => {
  const sel = document.querySelector('.bar select');
  if (!sel) return 'no select';
  const opt = [...sel.options].find(o => o.textContent.includes('Tottenham'));
  if (!opt) return 'no tottenham option';
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
  setter.call(sel, opt.value);
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  return 'selected ' + opt.value;
})()`));
await sleep(3500);

console.log("REPORT_CLICK:", await evalJs(clickText("Report")));

let ready = false;
for (let i = 0; i < 30; i++) {
  await sleep(1000);
  if (await evalJs(`!!document.querySelector('.hub-card') && !!document.querySelector('.report-masthead')`)) { ready = true; break; }
}
console.log("REPORT_READY:", ready);

if (ready) {
  const diag = await evalJs(`(() => {
    const out = {};
    const qa = (s) => [...document.querySelectorAll(s)];
    const findCard = (text) => { const h = qa('h4').find(x => x.textContent.includes(text)); return h ? h.closest('.card') : null; };

    const tac = findCard('Tactical geography');
    out.tactical = tac ? (() => {
      const pitch = tac.querySelector('svg.pitch');
      const svgs = [...tac.querySelectorAll('svg')];
      const sonar = svgs.find(s => !s.classList.contains('pitch')) || null;
      return {
        found: true,
        htmlLen: tac.innerHTML.length,
        textPreview: tac.textContent.slice(0, 220).replace(/\\s+/g, ' '),
        heatmapCount: tac.querySelectorAll('svg.pitch').length,
        sonarCount: sonar ? 1 : 0,
        heatmapDims: pitch ? (() => { const r = pitch.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })() : null,
        sonarDims: sonar ? (() => { const r = sonar.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })() : null,
        sonarPolyFill: sonar ? getComputedStyle(sonar.querySelector('polygon')).fill : null,
      };
    })() : { found: false };

    const hub = findCard('Hub player tactical');
    out.hub = hub ? {
      found: true,
      htmlLen: hub.innerHTML.length,
      textPreview: hub.textContent.slice(0, 220).replace(/\\s+/g, ' '),
      hubCards: hub.querySelectorAll('.hub-card').length,
      hubSections: hub.querySelectorAll('.hub-section').length,
      rSecs: hub.querySelectorAll('.r-sec').length,
      stats: hub.querySelectorAll('.stat').length,
      intCharts: hub.querySelectorAll('.int-chart').length,
      connGrids: hub.querySelectorAll('.conn-grid').length,
      dirBars: hub.querySelectorAll('.dir-bar').length,
      openDetails: hub.querySelectorAll('details[open]').length,
      closedDetails: hub.querySelectorAll('details:not([open])').length,
      firstHubName: (hub.querySelector('.hub-name') || {}).textContent || null,
    } : { found: false };

    out.undefinedInBody = (document.body.innerText.split('undefined').length - 1);
    out.hubCellSamples = [...document.querySelectorAll('table td:nth-child(4)')].slice(0, 4).map(td => td.textContent.trim());

    out.doc = {
      clientW: document.documentElement.clientWidth,
      scrollW: document.documentElement.scrollWidth,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
    const overflowers = [];
    qa('.card, .hub-section, .stat').forEach(c => {
      const r = c.getBoundingClientRect();
      if (r.right > document.documentElement.clientWidth + 2) overflowers.push(c.className.toString().slice(0, 30) + ' right=' + Math.round(r.right));
    });
    out.overflowingEls = overflowers.slice(0, 12);
    return out;
  })()`);
  console.log("DIAG:" + JSON.stringify(diag, null, 1));

  await send("Emulation.setEmulatedMedia", { media: "print" });
  await sleep(1200);
  const pdiag = await evalJs(`(() => {
    const out = {};
    const qa = (s) => [...document.querySelectorAll(s)];
    const cols = qa('.cols')[0];
    if (cols) out.colsDisplay = getComputedStyle(cols).display;
    const hg = qa('.hub-grid')[0];
    if (hg) out.hubGridDisplay = getComputedStyle(hg).display;
    out.bodyBg = getComputedStyle(document.body).backgroundColor;
    const logo = document.querySelector('.report-brand svg circle');
    if (logo) out.logoCircleFill = getComputedStyle(logo).fill;
    const tacH4 = qa('h4').find(x => x.textContent.includes('Tactical geography'));
    const tac = tacH4 ? tacH4.closest('.card') : null;
    if (tac) {
      const p = tac.querySelector('svg.pitch');
      if (p) { const r = p.getBoundingClientRect(); out.tacticalHeatmapPrint = { w: Math.round(r.width), h: Math.round(r.height) }; }
      const sonar = [...tac.querySelectorAll('svg')].find(s => !s.classList.contains('pitch'));
      if (sonar) {
        const grid = sonar.querySelector('circle');
        const lbl = sonar.querySelector('text');
        if (grid) out.sonarGridStroke = getComputedStyle(grid).stroke;
        if (lbl) out.sonarLabelFill = getComputedStyle(lbl).fill;
      }
    }
    out.docW = document.documentElement.scrollWidth;
    return out;
  })()`);
  console.log("PRINT_DIAG:" + JSON.stringify(pdiag));

  // Simulate the browser print pipeline: beforeprint opens collapsible hub boxes
  await evalJs(`window.dispatchEvent(new Event('beforeprint'))`);
  const openCount = await evalJs(`[...document.querySelectorAll('details.r-sec')].filter(d => d.open).length`);
  const totalRsec = await evalJs(`document.querySelectorAll('details.r-sec').length`);
  console.log("BEFOREPRINT_OPEN:" + openCount + "/" + totalRsec);

  const pdf = await send("Page.printToPDF", { printBackground: true, preferCSSPageSize: true });
  const fs = await import("node:fs");
  fs.writeFileSync("report_diag.pdf", Buffer.from(pdf.result.data, "base64"));
  console.log("PDF_WRITTEN");

  await evalJs(`window.dispatchEvent(new Event('afterprint'))`);
  const restored = await evalJs(`[...document.querySelectorAll('details.r-sec[data-print-opened]')].length`);
  const stillOpen = await evalJs(`[...document.querySelectorAll('details.r-sec')].filter(d => d.open).length`);
  console.log("AFTERPRINT_RESTORED_LEFTOVERS:" + restored + " OPEN:" + stillOpen);
}

console.log("ISSUES:" + JSON.stringify(issues.slice(0, 25)));
ws.close();
process.exit(0);
