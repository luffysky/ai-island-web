// 自架 CJK 字體（照 Space「從 GitHub 下載自架」）：下載 ttf → 上傳 fonts bucket → 註冊啟用。
// 用法：node scripts/install-cjk-fonts.mjs
// ＊未 subset、整檔上傳（每檔約 14MB）；使用者選了該字體才會載。之後可加 subset 瘦身。
import { readFileSync } from "node:fs";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const lines = readFileSync(".env.local", "utf8").split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[m[1]] = v;
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const DB_URL = env.SUPABASE_DB_URL;
if (!SUPABASE_URL || !SERVICE_KEY || !DB_URL) { console.error("❌ 缺 env"); process.exit(1); }

// 有乾淨 raw ttf 來源的（Regular 400）自動裝。
// 已裝總覽（0806）：
//   霞鶩文楷  → Google Fonts css_url（seed，最省，動態子集）
//   昭源黑/宋 → 本 script（raw GitHub release 分支 STATIC_TTF）
//   朱雀仿宋  → release zip（v0.212）手動解壓上傳 zhuque-fangsong/400.ttf（見 commit）
//   台北黑體  → Space 亦標 manual、JT Foundry 官網無穩定下載網址 → 待人工上傳
//   清松手寫  → 無任何自動來源 → 待人工上傳
const FONTS = [
  { slug: "chiron-hei-hk", weight: 400, url: "https://raw.githubusercontent.com/chiron-fonts/chiron-hei-hk/release/STATIC_TTF/ChironHeiHK-N.ttf" },
  { slug: "chiron-sung-hk", weight: 400, url: "https://raw.githubusercontent.com/chiron-fonts/chiron-sung-hk/release/STATIC_TTF/ChironSungHK-N.ttf" },
];

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
async function uploadToBucket(path, bytes) {
  const { error } = await admin.storage.from("fonts").upload(path, bytes, { contentType: "font/ttf", upsert: true });
  if (error) throw new Error(`upload ${path} 失敗: ${error.message}`);
}

const client = new pg.Client({ connectionString: DB_URL });
await client.connect();

for (const f of FONTS) {
  process.stdout.write(`▶️  ${f.slug} 下載…`);
  const r = await fetch(f.url, { headers: { "User-Agent": "ai-island-font-installer" } });
  if (!r.ok) { console.log(` ❌ 下載 ${r.status}`); continue; }
  const bytes = Buffer.from(await r.arrayBuffer());
  process.stdout.write(` ${(bytes.length / 1048576).toFixed(1)}MB → 上傳…`);
  const path = `${f.slug}/${f.weight}.ttf`;
  await uploadToBucket(path, bytes);
  // 併入既有 file_manifest / weights；設 enabled、清 css_url（走自架）
  await client.query(
    `update public.fonts
       set file_manifest = coalesce(file_manifest,'{}'::jsonb) || jsonb_build_object($2::text, jsonb_build_object('path',$3::text)),
           weights = (select array(select distinct unnest(coalesce(weights,'{}') || array[$4::int]) order by 1)),
           css_url = null, enabled = true, updated_at = now()
     where slug = $1`,
    [f.slug, String(f.weight), path, f.weight],
  );
  console.log(" ✅ 啟用");
}

await client.end();
console.log("完成。");
