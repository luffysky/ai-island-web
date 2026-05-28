/** 對 production 打 3 個無副作用 cron endpoint、確認可用 */
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, "")])
);

const SITE = env.NEXT_PUBLIC_SITE_URL || "https://ai-island-web.snowrealm.pet";
const SECRET = env.CRON_SECRET;
const out = { site: SITE, secret_set: !!SECRET, tests: {} };

async function hit(name, url, opts = {}) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(30_000) });
    const body = await r.text();
    out.tests[name] = {
      status: r.status,
      ms: Date.now() - t0,
      body_first_300: body.slice(0, 300),
      content_type: r.headers.get("content-type"),
    };
  } catch (e) {
    out.tests[name] = { error: e?.message, cause: e?.cause?.code ?? null, ms: Date.now() - t0 };
  }
}

// 1. keep-warm — 公開、不用 auth、最常被自動停用的
await hit("keep-warm_no_auth", `${SITE}/api/cron/keep-warm`);

// 2. keep-warm 加 secret（cron-job.org 免費版用 query）
if (SECRET) await hit("keep-warm_with_secret", `${SITE}/api/cron/keep-warm?secret=${SECRET}`);

// 3. anomaly-check — Bearer header
if (SECRET) {
  await hit("anomaly-check", `${SITE}/api/cron/anomaly-check`, {
    headers: { Authorization: `Bearer ${SECRET}` },
  });
}

// 4. ga4 sync — x-cron-secret header（沒設 GA4_PROPERTY_ID 應該 503、那也沒關係）
if (SECRET) {
  await hit("ga4-sync", `${SITE}/api/admin/ga4/sync`, {
    headers: { "x-cron-secret": SECRET },
  });
}

console.log(JSON.stringify(out, null, 2));
