// Piyano Koçu SW — ağ öncelikli gezinme: güncellemeler otomatik, çevrimdışı yedekli
const V = "piyano-kocu-v45";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(V).then((c) => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const isNav = req.mode === "navigate" || new URL(req.url).pathname.endsWith("/index.html");
  if (isNav) {
    // AĞ ÖNCELİKLİ: her açılışta güncel sürüm; 3.5 sn'de yanıt yoksa / çevrimdışıysa önbellek
    e.respondWith(
      withTimeout(fetch(req), 3500)
        .then((r) => {
          const cp = r.clone();
          caches.open(V).then((c) => { c.put("./index.html", cp).catch(() => {}); });
          return r;
        })
        .catch(() => caches.match("./index.html").then((m) => m || caches.match("./")))
    );
    return;
  }
  // statik varlıklar: önbellek öncelikli
  e.respondWith(
    caches.match(req).then((m) => m || fetch(req).then((r) => {
      const cp = r.clone();
      caches.open(V).then((c) => { c.put(req, cp).catch(() => {}); });
      return r;
    }))
  );
});
