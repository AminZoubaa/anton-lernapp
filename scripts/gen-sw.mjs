// Läuft nach `next build` (postbuild): sammelt ALLE Dateien aus out/ und
// schreibt einen Service Worker mit vollständiger Precache-Liste.
// → Die App läuft nach dem ersten Öffnen komplett ohne Internet.
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";

const OUT = "out";
const BASE = process.env.GITHUB_PAGES === "true" ? "/anton-lernapp" : "";

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const files = walk(OUT)
  .map((p) => relative(OUT, p).split("\\").join("/"))
  .filter((f) => f !== "sw.js" && !f.endsWith(".map") && f !== ".nojekyll" && !f.startsWith(".git"))
  // Die ~2000 Sprach-MP3s nicht beim Installieren laden (zu viele Requests für
  // iOS), sondern beim ersten Abspielen cachen bzw. über "Offline-Paket laden"
  // im Eltern-Bereich komplett vorladen. Laute + Manifest kommen sofort mit.
  .filter((f) => !f.startsWith("audio/sprache/"));

const hash = createHash("sha1");
for (const f of files) hash.update(f).update(String(statSync(join(OUT, f)).size));
const VERSION = hash.digest("hex").slice(0, 10);

// HTML-Seiten sowohl als "…/index.html" als auch als Ordner-URL "…/" cachen
const urls = new Set();
for (const f of files) {
  urls.add(`${BASE}/${f}`);
  if (f.endsWith("index.html")) urls.add(`${BASE}/${f.slice(0, -"index.html".length)}`);
}

const sw = `// Automatisch erzeugt von scripts/gen-sw.mjs – nicht von Hand ändern
const VERSION = "${VERSION}";
const CACHE = "anton-lernapp-" + VERSION;
const PRECACHE = ${JSON.stringify([...urls])};

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then(async (c) => {
      // Einzeln laden, damit eine fehlende Datei nicht alles blockiert
      await Promise.all(
        PRECACHE.map((u) => c.add(new Request(u, { cache: "reload" })).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
  if (e.data === "GET_VERSION" && e.source) e.source.postMessage({ type: "VERSION", version: VERSION });
});

// Seiten (HTML): Netzwerk zuerst, sonst Cache. Alles andere: Cache zuerst.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  const isPage = e.request.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith(".html");
  if (isPage) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then((r) => r || caches.match("${BASE}/")))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
    )
  );
});
`;
writeFileSync(join(OUT, "sw.js"), sw);
console.log(`sw.js: ${urls.size} URLs, Version ${VERSION}`);
