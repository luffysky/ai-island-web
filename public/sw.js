/**
 * AI 島 Service Worker v3
 *
 * 策略：
 *   - 靜態 (/_next/static, /favicon, /og.png 等)：Cache First、永久（檔名帶 hash 自然 invalidate）
 *   - 章節 / 副本 / 部落格 GET：Network First、失敗 fallback cache
 *   - 其他 GET：Network First
 *   - /api/* /auth/* /island/* /admin/*：永遠不快取（API / OAuth / 3D 不適合）
 *   - 離線時 navigate fallback → /offline
 *   - 不主動 navigate clients、避免破 OAuth callback (#access_token)
 */

const VERSION = "v8-2026-06-30";
const STATIC_CACHE = `static-${VERSION}`;
const PAGES_CACHE = `pages-${VERSION}`;
const PYODIDE_CACHE = `pyodide-v0.26.4`;  // 跟 Pyodide 版本綁定、版本沒變就不換 cache
// 使用者主動「存離線」的章節：不帶版本、SW 更新也不清掉（地鐵也看得到已存章節）
const OFFLINE_CACHE = "offline-saved";
const OFFLINE_URL = "/offline";

// 不攔截 / 不快取的路徑
const SKIP_PATHS = [
  "/api/",
  "/auth/",
  "/island", // 3D 場景 + cookie state
  "/admin",
  "/_next/data",
  "/me/",
  "/pyodide-worker.js",  // worker file 自己處理、不快取
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll([OFFLINE_URL, "/favicon.svg", "/manifest.webmanifest"]).catch(() => {});
      self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 清掉舊版 cache（保留目前版本 + pyodide + 使用者存離線的章節）
      const keep = new Set([STATIC_CACHE, PAGES_CACHE, PYODIDE_CACHE, OFFLINE_CACHE]);
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

// 收到 SKIP_WAITING 訊息 → 立刻接手 (PWAInstall update banner 觸發)
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data) return;
  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  // 使用者按「存離線」→ 把該章 URL 抓下來放進 OFFLINE_CACHE（永久、SW 更新也留著）
  if (data.type === "OFFLINE_SAVE" && data.url) {
    event.waitUntil((async () => {
      try {
        const cache = await caches.open(OFFLINE_CACHE);
        const res = await fetch(data.url, { credentials: "include" });
        if (res.ok) await cache.put(data.url, res.clone());
        const client = event.source;
        if (client) client.postMessage({ type: "OFFLINE_SAVED", url: data.url, ok: res.ok });
      } catch {
        const client = event.source;
        if (client) client.postMessage({ type: "OFFLINE_SAVED", url: data.url, ok: false });
      }
    })());
  }
  if (data.type === "OFFLINE_REMOVE" && data.url) {
    event.waitUntil((async () => {
      const cache = await caches.open(OFFLINE_CACHE);
      await cache.delete(data.url);
      const client = event.source;
      if (client) client.postMessage({ type: "OFFLINE_REMOVED", url: data.url });
    })());
  }
});

function shouldSkip(url) {
  if (url.origin !== self.location.origin) return true;
  return SKIP_PATHS.some((p) => url.pathname.startsWith(p));
}

// Pyodide CDN cache: 載一次永遠 local、重整不再下載
function isPyodideAsset(url) {
  return url.hostname === "cdn.jsdelivr.net" && url.pathname.includes("/pyodide/");
}

// CDN library cache (React / Vue / Babel)
function isCdnLibrary(url) {
  if (url.hostname !== "unpkg.com") return false;
  return /\b(react|react-dom|vue|@babel\/standalone)\b/.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Pyodide / CDN library：Cache First、永久 (避免重整 30s)
  if (isPyodideAsset(url) || isCdnLibrary(url)) {
    event.respondWith(cacheFirst(req, PYODIDE_CACHE));
    return;
  }

  if (shouldSkip(url)) return;

  // 靜態檔（_next/static + 圖片字體）— Cache First
  if (url.pathname.startsWith("/_next/static") || /\.(woff2?|ttf|otf|png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // HTML navigation — Network First、失敗 fallback cache、再失敗 → offline page
  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req, PAGES_CACHE));
    return;
  }
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok && res.status === 200) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch {
    return cached || Response.error();
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok && res.status === 200) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    // 試使用者主動「存離線」的章節（OFFLINE_CACHE 永久、SW 更新也留著）
    const offlineCache = await caches.open(OFFLINE_CACHE);
    const saved = await offlineCache.match(req, { ignoreSearch: true });
    if (saved) return saved;
    // 離線 + 沒 cache → 給 offline 頁
    const offline = await cache.match(OFFLINE_URL);
    if (offline) return offline;
    return Response.error();
  }
}

// 留給將來 Web Push
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = { title: "AI 島", body: "你有一則通知" };
  try {
    payload = event.data.json();
  } catch {}
  event.waitUntil(
    self.registration.showNotification(payload.title || "AI 島", {
      body: payload.body || "",
      icon: payload.icon || "/favicon.svg",
      badge: "/favicon.svg",
      data: { url: payload.url || "/" },
      tag: payload.tag || "ai-island",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url === url && "focus" in c) return c.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
