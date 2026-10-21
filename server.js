// Winterplan: kleiner Server ohne Abhängigkeiten.
// Liefert index.html aus und speichert die gemeinsamen Eingaben als JSON-Datei.
//
// Umgebungsvariablen (alle optional):
//   PORT        wird von Railway gesetzt
//   DATA_DIR    Ordner für state.json, auf Railway der Mount-Pfad des Volumes (z. B. /data)
//   BASIC_AUTH  "benutzer:passwort" schützt die Seite mit einem Login

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const FILE = path.join(DATA_DIR, "state.json");
const AUTH = process.env.BASIC_AUTH ? "Basic " + Buffer.from(process.env.BASIC_AUTH).toString("base64") : "";
const KEY_RE = /^[A-Za-z0-9_.~:@+-]{1,200}$/;
const MAX_BODY = 64 * 1024;
const MAX_KEYS = 3000;

fs.mkdirSync(DATA_DIR, { recursive: true });
let state = {};
try { state = JSON.parse(fs.readFileSync(FILE, "utf8")); } catch (e) { state = {}; }

let timer = null;
function save() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const tmp = FILE + ".tmp";
    fs.writeFile(tmp, JSON.stringify(state), (err) => {
      if (!err) fs.rename(tmp, FILE, () => {});
    });
  }, 200);
}

function send(res, code, body, type) {
  res.writeHead(code, {
    "content-type": type || "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  if (AUTH && req.headers.authorization !== AUTH) {
    res.writeHead(401, { "www-authenticate": 'Basic realm="Winterplan"' });
    return res.end("Login erforderlich");
  }
  const url = new URL(req.url, "http://localhost");
  const p = url.pathname;

  if (p === "/healthz") return send(res, 200, "ok", "text/plain");

  if (p === "/api/state" && req.method === "GET") return send(res, 200, JSON.stringify(state));

  if (p.startsWith("/api/state/")) {
    let key;
    try { key = decodeURIComponent(p.slice("/api/state/".length)); } catch (e) { return send(res, 400, '{"error":"key"}'); }
    if (!KEY_RE.test(key) || key === "__proto__") return send(res, 400, '{"error":"key"}');

    if (req.method === "DELETE") {
      delete state[key];
      save();
      return send(res, 200, "{}");
    }
    if (req.method === "PUT") {
      let size = 0;
      const chunks = [];
      req.on("data", (c) => {
        size += c.length;
        if (size > MAX_BODY) { req.destroy(); return; }
        chunks.push(c);
      });
      req.on("end", () => {
        let body;
        try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch (e) { return send(res, 400, '{"error":"json"}'); }
        if (!body || typeof body !== "object" || Array.isArray(body)) return send(res, 400, '{"error":"object"}');
        if (!Object.prototype.hasOwnProperty.call(state, key) && Object.keys(state).length >= MAX_KEYS) return send(res, 507, '{"error":"full"}');
        state[key] = Object.assign({}, state[key], body);
        save();
        send(res, 200, JSON.stringify(state[key]));
      });
      return;
    }
    return send(res, 405, '{"error":"method"}');
  }

  if ((p === "/" || p === "/index.html") && req.method === "GET") {
    return fs.readFile(path.join(__dirname, "index.html"), (err, html) => {
      if (err) return send(res, 500, "index.html fehlt", "text/plain");
      send(res, 200, html, "text/html; charset=utf-8");
    });
  }
  send(res, 404, "Nicht gefunden", "text/plain");
});

server.listen(PORT, () => console.log("Winterplan läuft auf Port " + PORT + ", Daten in " + FILE));
