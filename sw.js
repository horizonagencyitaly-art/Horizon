/* Plan B: no web push. Cache shell only. */
const CACHE = "desk-shell-v1";
const SHELL = ["./", "./index.html", "./app.css", "./app.js", "./chart.js", "./manifest.json"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("fetch", e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
self.addEventListener("push", () => {
  // Plan B Telegram only — ignore push
});
