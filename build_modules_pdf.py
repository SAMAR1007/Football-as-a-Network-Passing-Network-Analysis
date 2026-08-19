"""Build MODULES_EXPLAINED.pdf from modules_explained.md.

Pipeline: markdown (a small, deliberate subset) -> styled HTML -> PDF via
headless Chrome --print-to-pdf. Chrome is required (the machine has no
reportlab/fpdf/LibreOffice), and this keeps the PDF looking like a proper
document: cover header, A4 pages, page numbers, styled headings and code.

Usage:
    python build_modules_pdf.py
"""

import os
import re
import subprocess
import sys
import tempfile

CONTENT = "modules_explained.md"
OUT = "MODULES_EXPLAINED.pdf"

CHROME_CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Users\%USERNAME%\AppData\Local\Google\Chrome\Application\chrome.exe",
]


def find_chrome():
    env = os.environ.get("CHROME_PATH")
    if env and os.path.exists(env):
        return env
    for c in CHROME_CANDIDATES:
        c = os.path.expandvars(c)
        if os.path.exists(c):
            return c
    for cmd in ("chrome", "google-chrome", "chromium"):
        try:
            path = subprocess.run(
                ["where", cmd] if os.name == "nt" else ["which", cmd],
                capture_output=True, text=True, check=False,
            ).stdout.strip().splitlines()
            if path and os.path.exists(path[0]):
                return path[0]
        except OSError:
            continue
    return None


# ---------------------------------------------------------------------------
# Minimal markdown -> HTML
# ---------------------------------------------------------------------------

def inline(md):
    md = re.sub(r"`([^`]+)`", r"<code>\1</code>", md)
    md = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", md)
    md = re.sub(r"\*([^*]+)\*", r"<em>\1</em>", md)
    return md


def to_html(md_text):
    lines = md_text.splitlines()
    html = []
    i = 0
    in_code = False
    code_buf = []
    list_open = {"ul": False, "ol": False}

    def close_lists():
        for k in list_open:
            if list_open[k]:
                html.append(f"</{k}>")
                list_open[k] = False

    while i < len(lines):
        line = lines[i]

        if line.strip().startswith("```"):
            if in_code:
                html.append('<pre class="code">' + "\n".join(code_buf) + "</pre>")
                code_buf = []
                in_code = False
            else:
                close_lists()
                in_code = True
            i += 1
            continue

        if in_code:
            code_buf.append(line)
            i += 1
            continue

        s = line.strip()
        if not s:
            close_lists()
            i += 1
            continue

        m = re.match(r"^(#{1,3})\s+(.*)$", s)
        if m:
            close_lists()
            level = len(m.group(1))
            tag = f"h{level}"
            html.append(f'<{tag} id="{re.sub(r"[^a-z0-9]+", "-", m.group(2).lower()).strip("-")}">{inline(m.group(2))}</{tag}>')
            i += 1
            continue

        if s.startswith("- "):
            if not list_open["ul"]:
                close_lists()
                html.append("<ul>")
                list_open["ul"] = True
            html.append(f"<li>{inline(s[2:])}</li>")
            i += 1
            continue

        if re.match(r"^\d+\.\s+", s):
            if not list_open["ol"]:
                close_lists()
                html.append("<ol>")
                list_open["ol"] = True
            html.append(f"<li>{inline(re.sub(r'^\d+\.\s+', '', s))}</li>")
            i += 1
            continue

        # Tables (pipe rows separated by a |-...-| separator)
        if s.startswith("|") and i + 1 < len(lines) and re.match(r"^\s*\|[\s:|-]+\|\s*$", lines[i + 1]):
            header = [c.strip() for c in s.strip().strip("|").split("|")]
            i += 2
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")])
                i += 1
            tbl = ["<table><thead><tr>"]
            tbl += [f"<th>{inline(h)}</th>" for h in header]
            tbl.append("</tr></thead><tbody>")
            for r in rows:
                tbl.append("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>")
            tbl.append("</tbody></table>")
            close_lists()
            html.append("".join(tbl))
            continue

        close_lists()
        html.append(f"<p>{inline(s)}</p>")
        i += 1

    close_lists()
    if in_code:
        html.append('<pre class="code">' + "\n".join(code_buf) + "</pre>")
    return "\n".join(html)


CSS = """
:root {
  --green: #0b3d2e;
  --accent: #c8a24a;
  --ink: #1c1c1e;
  --muted: #55575c;
}
* { box-sizing: border-box; }
@page {
  size: A4;
  margin: 18mm 16mm 18mm 16mm;
  @bottom-center { content: counter(page) " / " counter(pages); font-size: 8pt; color: #999; }
}
body {
  font-family: "Segoe UI", Calibri, Arial, sans-serif;
  font-size: 10pt;
  line-height: 1.55;
  color: var(--ink);
  margin: 0;
}
.cover {
  border-bottom: 3px solid var(--accent);
  margin-bottom: 14px;
  padding-bottom: 12px;
}
.cover .kicker {
  font-size: 8.5pt; letter-spacing: 2px; text-transform: uppercase;
  color: var(--green); font-weight: 600;
}
.cover h1 { font-size: 21pt; margin: 4px 0 6px; color: var(--green); line-height: 1.2; }
.cover .subtitle { font-size: 11pt; color: var(--muted); margin: 0; }
h2 {
  font-size: 14pt; color: var(--green);
  border-bottom: 1px solid #d8d4c8; padding-bottom: 3px;
  margin: 18px 0 8px; page-break-after: avoid;
}
h3 {
  font-size: 12pt; color: #14382c;
  margin: 14px 0 6px; page-break-after: avoid;
}
p { margin: 6px 0; text-align: justify; }
ul, ol { margin: 6px 0 6px 0; padding-left: 18px; }
li { margin: 2px 0; }
code {
  font-family: Consolas, "Cascadia Mono", monospace;
  font-size: 8.8pt; background: #f2efe6; padding: 0 3px; border-radius: 3px;
  color: #7a4a1f;
}
pre.code {
  font-family: Consolas, "Cascadia Mono", monospace;
  font-size: 8.6pt; background: #f4f1e8; border-left: 3px solid var(--accent);
  padding: 8px 10px; border-radius: 4px; white-space: pre-wrap;
  margin: 8px 0; page-break-inside: avoid; line-height: 1.45;
}
table { border-collapse: collapse; margin: 10px 0; width: 100%; page-break-inside: avoid; }
th, td { border: 1px solid #ccc6b4; padding: 4px 8px; text-align: left; font-size: 9pt; }
th { background: var(--green); color: #fff; }
tr:nth-child(even) td { background: #f7f5ee; }
hr { border: none; border-top: 1px solid #e0dccf; margin: 14px 0; }
"""


def build():
    with open(CONTENT, encoding="utf-8") as fh:
        md_text = fh.read()

    body = to_html(md_text)
    title = "The Fourteen Modules of the Passing Networks Engine"
    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<style>{CSS}</style>
</head>
<body>
<div class="cover">
  <div class="kicker">Passing Networks Engine &middot; predict_server.py</div>
  <h1>{title}</h1>
  <p class="subtitle">How every analysis module works — network, centrality, weakest link, tactical metrics, and the match story. Generated from modules_explained.md.</p>
</div>
{body}
</body>
</html>"""

    chrome = find_chrome()
    if not chrome:
        print("ERROR: Chrome not found. Set CHROME_PATH to chrome.exe.", file=sys.stderr)
        sys.exit(1)

    with tempfile.TemporaryDirectory() as td:
        html_path = os.path.join(td, "modules.html")
        with open(html_path, "w", encoding="utf-8") as fh:
            fh.write(page)

        pdf_path = os.path.abspath(OUT)
        url = "file:///" + html_path.replace("\\", "/")
        cmd = [
            chrome, "--headless", "--disable-gpu", "--no-pdf-header-footer",
            f"--print-to-pdf={pdf_path}", "--print-to-pdf-no-header",
            url,
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=180)
        if res.returncode != 0:
            print(res.stdout, res.stderr, file=sys.stderr)
            print("Chrome exited with", res.returncode, file=sys.stderr)
            sys.exit(1)

    if os.path.exists(OUT):
        size = os.path.getsize(OUT) / 1024
        print(f"Saved {OUT} ({size:.0f} KB) using {os.path.basename(chrome)}")
    else:
        print("ERROR: PDF was not produced.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    build()
