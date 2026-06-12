/* sw.js — 只快取「殼層」(HTML/manifest/圖示)。
   語句資料不經過這裡:由 app 存在 localStorage,離線時直接讀取。
   更新策略:network-first 取殼層,失敗才回退快取 → 部署新版後重開即生效,
   斷網時仍能秒開舊殼。 */
const SHELL_CACHE = "phrase-shell-v1";
const SHELL = ["./", "./index.html", "./app.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL_CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== SHELL_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // GAS 資料請求(POST/跨域)一律放行,不攔截、不快取
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(SHELL_CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })
        .then(hit => hit || caches.match("./index.html")))
  );
});
