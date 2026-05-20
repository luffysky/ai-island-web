// 這個 sw.js 只負責「自我卸載」、不做任何其他事
// 為什麼：之前的版本會在 activate 時 navigate 所有 client、
// 結果把 OAuth callback 的 #access_token 切掉、登入失敗
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 取消所有 cache
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch {}
      // unregister 自己（但不 navigate clients、避免破壞 hash）
      try {
        await self.registration.unregister();
      } catch {}
    })()
  );
});

// 不攔截任何 fetch
self.addEventListener("fetch", () => {});
