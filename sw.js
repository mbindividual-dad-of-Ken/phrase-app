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
  /* 【修正】原本把同源所有 GET 都寫進殼層快取——未來加任何檔案，
     快取會無界成長且 activate 只清舊版本快取名、清不到這些。
     現在只快取 SHELL 清單內的路徑；清單外照常網路取得、不落快取。 */
  const path = url.pathname.slice(url.pathname.lastIndexOf("/") + 1) || "index.html";
  const inShell = SHELL.some(s => s === "./" + path || (s === "./" && path === "index.html"));
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (inShell && res.ok) {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })
        .then(hit => hit || (e.request.mode === "navigate" ? caches.match("./index.html") : Response.error())))
  );
});