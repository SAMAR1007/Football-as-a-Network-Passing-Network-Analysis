// API layer - talks to api_server.py /api/predict

const cache = {};

export async function api(cmd) {
  const key = JSON.stringify(cmd);
  if (cache[key]) return cache[key];
  const r = await fetch("/api/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: key,
  });
  let j;
  try {
    j = await r.json();
  } catch {
    // Empty or non-JSON body (e.g. backend down, still starting, or restarted
    // after a code change) — surface an actionable message instead of the raw
    // JSON.parse error.
    throw new Error(
      `Server returned HTTP ${r.status} with an empty or non-JSON body. ` +
        `Make sure python api_server.py is running, and restart it after code changes.`
    );
  }
  if (!r.ok && j && j.error) throw new Error(j.error);
  cache[key] = j;
  return j;
}

export function bustCache(pattern) {
  const prefix = JSON.stringify(pattern);
  for (const key of Object.keys(cache)) {
    if (key.startsWith(prefix)) delete cache[key];
  }
}
