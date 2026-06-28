// 煙霧測試（零依賴、用 node fetch）：打關鍵公開路由、確認站還活著、沒整片 500/404。
// 比 admin/site-audit 輕、可進 CI / 排程。
//   node scripts/smoke-test.mjs                       # 打正式機
//   BASE_URL=http://localhost:3000 node scripts/smoke-test.mjs
//
// 退出碼非 0 = 有失敗（CI 會紅）。

const BASE = (process.argv[2] || process.env.BASE_URL || "https://ai-island-web.snowrealm.pet").replace(/\/$/, "");

// [path, expectedStatus, mustContain?]
const CHECKS = [
  ["/", 200, "AI"],
  ["/chapters", 200, null],
  ["/chapters/26", 200, null],
  ["/login", 200, null],
  ["/blogs", 200, null],
  ["/offline", 200, null],
  ["/pricing", 200, null],
  ["/sitemap.xml", 200, null],
  ["/robots.txt", 200, null],
  ["/api/nav", 200, "chapters"],
  ["/creator-island", 307, null], // flag 開 + 未登入 → 轉址 /login
  ["/this-page-should-not-exist-xyz", 404, null],
];

async function check(pathname, expectStatus, mustContain) {
  const url = BASE + pathname;
  const t0 = Date.now();
  try {
    const res = await fetch(url, { redirect: "manual", headers: { "User-Agent": "ai-island-smoke" } });
    const ms = Date.now() - t0;
    // 2xx 或 3xx（轉址）對某些頁也算活著；但這裡用明確 expectStatus
    let ok = res.status === expectStatus;
    let note = `${res.status} ${ms}ms`;
    if (ok && mustContain) {
      const body = await res.text();
      if (!body.includes(mustContain)) { ok = false; note += ` ⚠ 缺「${mustContain}」`; }
    }
    return { pathname, ok, note };
  } catch (e) {
    return { pathname, ok: false, note: `fetch failed: ${e.message}` };
  }
}

const results = await Promise.all(CHECKS.map(([p, s, c]) => check(p, s, c)));
let failed = 0;
console.log(`🔍 煙霧測試 @ ${BASE}\n`);
for (const r of results) {
  console.log(`${r.ok ? "✅" : "❌"} ${r.pathname.padEnd(38)} ${r.note}`);
  if (!r.ok) failed++;
}
console.log(`\n${failed === 0 ? "🎉 全過" : `💥 ${failed} 個失敗`}（共 ${results.length}）`);
process.exit(failed > 0 ? 1 : 0);
