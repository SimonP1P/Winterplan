// Winterplan auf Netlify: speichert die gemeinsamen Eingaben dauerhaft in Netlify Blobs.
// Gleiche Schnittstelle wie server.js:
//   GET    /api/state        liefert alle Einträge als ein JSON-Objekt
//   PUT    /api/state/<key>  mischt das gesendete Objekt in den Eintrag
//   DELETE /api/state/<key>  entfernt den Eintrag
import { getStore } from "@netlify/blobs";

export const config = { path: ["/api/state", "/api/state/*"] };

const KEY_RE = /^[A-Za-z0-9_.~:@+-]{1,200}$/;
const MAX_BODY = 64 * 1024;
const MAX_KEYS = 3000;
const HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff"
};
const reply = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: HEADERS });
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

// Liest den ganzen Stand, ändert ihn und schreibt nur, wenn ihn niemand dazwischen geändert hat
// (bedingtes Schreiben über den ETag). Liefert der Speicher keinen ETag, wird nach dem Schreiben
// nachgelesen und bei Bedarf wiederholt. So gehen gleichzeitige Änderungen von Simon und Liz nicht verloren.
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function update(store, mutate, confirmed) {
  for (let i = 0; i < 25; i++) {
    const cur = await store.getWithMetadata("state", { type: "json", consistency: "strong" });
    const data = cur && cur.data && typeof cur.data === "object" && !Array.isArray(cur.data) ? cur.data : {};
    const failure = mutate(data);
    if (failure) return failure;
    const res = !cur
      ? await store.setJSON("state", data, { onlyIfNew: true })
      : cur.etag
        ? await store.setJSON("state", data, { onlyIfMatch: cur.etag })
        : await store.setJSON("state", data);
    if (res.modified) {
      if (cur && cur.etag) return { data };
      const check = await store.get("state", { type: "json", consistency: "strong" });
      if (check && confirmed(check)) return { data };
    }
    await pause(10 + Math.random() * 60);
  }
  return { status: 409, error: "busy" };
}

export default async (req) => {
  const store = getStore({ name: "winterplan", consistency: "strong" });
  const rest = new URL(req.url).pathname.replace(/^\/api\/state\/?/, "");

  if (rest === "") {
    if (req.method !== "GET") return reply({ error: "method" }, 405);
    const all = await store.get("state", { type: "json", consistency: "strong" });
    return reply(all && typeof all === "object" && !Array.isArray(all) ? all : {});
  }

  let key;
  try { key = decodeURIComponent(rest); } catch { return reply({ error: "key" }, 400); }
  if (!KEY_RE.test(key) || key === "__proto__") return reply({ error: "key" }, 400);

  if (req.method === "DELETE") {
    const r = await update(store, (data) => { delete data[key]; }, (now) => !has(now, key));
    return r.error ? reply({ error: r.error }, r.status) : reply({});
  }

  if (req.method === "PUT") {
    const text = await req.text();
    if (text.length > MAX_BODY) return reply({ error: "size" }, 413);
    let body;
    try { body = JSON.parse(text); } catch { return reply({ error: "json" }, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body)) return reply({ error: "object" }, 400);
    const r = await update(store, (data) => {
      if (!has(data, key) && Object.keys(data).length >= MAX_KEYS) return { status: 507, error: "full" };
      data[key] = Object.assign({}, has(data, key) ? data[key] : {}, body);
    }, (now) => has(now, key) && Object.keys(body).every((f) => JSON.stringify(now[key][f]) === JSON.stringify(body[f])));
    return r.error ? reply({ error: r.error }, r.status) : reply(r.data[key]);
  }

  return reply({ error: "method" }, 405);
};
