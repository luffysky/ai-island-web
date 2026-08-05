// 種字體 catalog：把 Space（SnowRealmSpace）目前有的字體全部灌進 AI 島 fonts 表。
// 「找到即裝、不用找檔案」——Google Fonts 有的直接存 CSS2 API URL（Google 幫做 CJK 子集 + CDN 供檔）；
// Google 沒有的少數 CJK（台北黑體 / 昭源 / 霞鶩文楷 / 朱雀仿宋）先種成 enabled=false 佔位，
// 之後由後台「字體管理」上傳字體檔安裝（跟 Space 對台北黑體的處理一樣）。
//
// 用法：node scripts/seed-fonts-catalog.mjs
// 冪等：依 slug upsert；重跑只會更新、不會重複。
// 不刪任何東西。

import { readFileSync, existsSync } from "node:fs";
import pg from "pg";

// —— Google Fonts CSS2 API URL 產生器 ——
// display=swap；CJK 交給 Google 動態子集（unicode-range 切片，只載可視字元）。
function gf(family, weights) {
  const fam = family.replace(/ /g, "+");
  const w = weights && weights.length ? `:wght@${weights.join(";")}` : "";
  return `https://fonts.googleapis.com/css2?family=${fam}${w}&display=swap`;
}

// scripts → supported_languages 對照（Space 用 zh-Hant/latin/bopomofo/ja/ko/arabic）
// —— 24 支字體目錄（照 Space font-catalogue.ts）——
const CATALOG = [
  // 繁體中文（Google 有：Noto TC、Huninn=jf粉圓、Iansui=芫荽）
  { slug: "noto-sans-tc", family: "Noto Sans TC", category: "sans", langs: ["zh-Hant", "latin", "bopomofo"], weights: [400, 500, 700, 900], fallback: '"PingFang TC", "Microsoft JhengHei", sans-serif', gfFamily: "Noto Sans TC", gfWeights: [400, 500, 700, 900] },
  { slug: "noto-serif-tc", family: "Noto Serif TC", category: "serif", langs: ["zh-Hant", "latin"], weights: [400, 500, 700, 900], fallback: '"Songti TC", "PMingLiU", serif', gfFamily: "Noto Serif TC", gfWeights: [400, 500, 700, 900] },
  { slug: "jf-open-huninn", family: "Huninn", category: "handwriting", langs: ["zh-Hant", "latin", "bopomofo"], weights: [400], fallback: '"jf open 粉圓", "PingFang TC", sans-serif', gfFamily: "Huninn", gfWeights: [] },
  { slug: "iansui", family: "Iansui", category: "handwriting", langs: ["zh-Hant", "latin"], weights: [400], fallback: '"Kaiti TC", "DFKai-SB", serif', gfFamily: "Iansui", gfWeights: [] },

  // 繁中：Google 沒有 → 佔位、待後台上傳字體檔安裝
  { slug: "taipei-sans-tc", family: "Taipei Sans TC Beta", category: "sans", langs: ["zh-Hant", "latin", "bopomofo"], weights: [300, 400, 700], fallback: '"PingFang TC", "Microsoft JhengHei", sans-serif', manual: "台北黑體 Beta（OFL）。Google Fonts 無、需自 github.com/gonhxai/taipei-sans-tc-beta 下載字體檔上傳。" },
  { slug: "chiron-hei-hk", family: "Chiron Hei HK", category: "sans", langs: ["zh-Hant", "latin"], weights: [300, 400, 500, 700], fallback: '"PingFang TC", sans-serif', manual: "昭源黑體（OFL）。需自 github.com/chiron-fonts/chiron-hei-hk 下載字體檔上傳。" },
  { slug: "chiron-sung-hk", family: "Chiron Sung HK", category: "serif", langs: ["zh-Hant", "latin"], weights: [300, 400, 500, 700], fallback: '"Songti TC", serif', manual: "昭源宋體（OFL）。需自 github.com/chiron-fonts/chiron-sung-hk 下載字體檔上傳。" },
  { slug: "lxgw-wenkai-tc", family: "LXGW WenKai TC", category: "handwriting", langs: ["zh-Hant", "latin"], weights: [300, 400, 700], fallback: '"Kaiti TC", "DFKai-SB", serif', manual: "霞鶩文楷 TC（OFL）。檔案大、需自 github.com/lxgw/LxgwWenKaiTC 下載字體檔上傳。" },
  { slug: "zhuque-fangsong", family: "Zhuque Fangsong", category: "serif", langs: ["zh-Hant", "latin"], weights: [400], fallback: '"FangSong", "STFangsong", serif', manual: "朱雀仿宋（OFL）。需自 github.com/TrionesType/zhuque 下載字體檔上傳。" },
  { slug: "qingsong-handwriting", family: "jf-tsingsung", category: "handwriting", langs: ["zh-Hant", "latin", "bopomofo"], weights: [400], fallback: '"Kaiti TC", "DFKai-SB", cursive', manual: "清松手寫體（justfont，OFL）。Google Fonts 無、需自 justfont 下載字體檔上傳安裝。" },

  // 拉丁（全部 Google 有）
  { slug: "inter", family: "Inter", category: "sans", langs: ["latin"], weights: [400, 500, 600, 700], fallback: "system-ui, sans-serif", gfFamily: "Inter", gfWeights: [400, 500, 600, 700] },
  { slug: "playfair-display", family: "Playfair Display", category: "serif", langs: ["latin"], weights: [400, 500, 600, 700, 800, 900], fallback: "Georgia, serif", gfFamily: "Playfair Display", gfWeights: [400, 500, 600, 700, 800, 900] },
  { slug: "cormorant-garamond", family: "Cormorant Garamond", category: "serif", langs: ["latin"], weights: [400, 500, 600, 700], fallback: "Garamond, Georgia, serif", gfFamily: "Cormorant Garamond", gfWeights: [400, 500, 600, 700] },
  { slug: "source-serif-4", family: "Source Serif 4", category: "serif", langs: ["latin"], weights: [400, 500, 600, 700], fallback: "Georgia, serif", gfFamily: "Source Serif 4", gfWeights: [400, 500, 600, 700] },
  { slug: "jetbrains-mono", family: "JetBrains Mono", category: "mono", langs: ["latin"], weights: [400, 500, 700], fallback: '"SFMono-Regular", Menlo, monospace', gfFamily: "JetBrains Mono", gfWeights: [400, 500, 700] },
  { slug: "lora", family: "Lora", category: "serif", langs: ["latin"], weights: [400, 500, 600, 700], fallback: "Georgia, serif", gfFamily: "Lora", gfWeights: [400, 500, 600, 700] },
  { slug: "nunito", family: "Nunito", category: "sans", langs: ["latin"], weights: [400, 600, 700, 800], fallback: "system-ui, sans-serif", gfFamily: "Nunito", gfWeights: [400, 600, 700, 800] },
  { slug: "space-grotesk", family: "Space Grotesk", category: "sans", langs: ["latin"], weights: [400, 500, 600, 700], fallback: "system-ui, sans-serif", gfFamily: "Space Grotesk", gfWeights: [400, 500, 600, 700] },

  // 日文（Google 有）
  { slug: "noto-sans-jp", family: "Noto Sans JP", category: "sans", langs: ["ja", "latin"], weights: [400, 500, 700, 900], fallback: '"Hiragino Sans", "Yu Gothic", sans-serif', gfFamily: "Noto Sans JP", gfWeights: [400, 500, 700, 900] },
  { slug: "noto-serif-jp", family: "Noto Serif JP", category: "serif", langs: ["ja", "latin"], weights: [400, 500, 700, 900], fallback: '"Hiragino Mincho", "Yu Mincho", serif', gfFamily: "Noto Serif JP", gfWeights: [400, 500, 700, 900] },
  { slug: "mplus-rounded-1c", family: "M PLUS Rounded 1c", category: "sans", langs: ["ja", "latin"], weights: [400, 500, 700, 800], fallback: '"Hiragino Maru Gothic", sans-serif', gfFamily: "M PLUS Rounded 1c", gfWeights: [400, 500, 700, 800] },
  { slug: "zen-maru-gothic", family: "Zen Maru Gothic", category: "sans", langs: ["ja", "latin"], weights: [400, 500, 700, 900], fallback: '"Hiragino Maru Gothic", sans-serif', gfFamily: "Zen Maru Gothic", gfWeights: [400, 500, 700, 900] },

  // 韓文（Google 有）
  { slug: "noto-sans-kr", family: "Noto Sans KR", category: "sans", langs: ["ko", "latin"], weights: [400, 500, 700, 900], fallback: '"Apple SD Gothic Neo", "Malgun Gothic", sans-serif', gfFamily: "Noto Sans KR", gfWeights: [400, 500, 700, 900] },
  { slug: "noto-serif-kr", family: "Noto Serif KR", category: "serif", langs: ["ko", "latin"], weights: [400, 500, 700, 900], fallback: '"Apple SD Gothic Neo", serif', gfFamily: "Noto Serif KR", gfWeights: [400, 500, 700, 900] },

  // 阿拉伯（Google 有）
  { slug: "noto-naskh-arabic", family: "Noto Naskh Arabic", category: "serif", langs: ["arabic", "latin"], weights: [400, 500, 600, 700], fallback: "serif", gfFamily: "Noto Naskh Arabic", gfWeights: [400, 500, 600, 700] },
];

// 中文顯示名（給後台/選字 UI 看「這是什麼字體」）
const ZH = {
  "noto-sans-tc": "思源黑體", "noto-serif-tc": "思源宋體",
  "jf-open-huninn": "jf open 粉圓", "iansui": "芫荽",
  "taipei-sans-tc": "台北黑體", "chiron-hei-hk": "昭源黑體", "chiron-sung-hk": "昭源宋體",
  "lxgw-wenkai-tc": "霞鶩文楷", "zhuque-fangsong": "朱雀仿宋", "qingsong-handwriting": "清松手寫體",
  "inter": "Inter 無襯線", "playfair-display": "Playfair 襯線標題", "cormorant-garamond": "Cormorant 襯線",
  "source-serif-4": "Source Serif 襯線", "jetbrains-mono": "JetBrains 等寬程式", "lora": "Lora 襯線",
  "nunito": "Nunito 圓潤無襯線", "space-grotesk": "Space Grotesk 幾何無襯線",
  "noto-sans-jp": "思源黑體 日文", "noto-serif-jp": "思源宋體 日文",
  "mplus-rounded-1c": "M PLUS 圓體", "zen-maru-gothic": "Zen 丸黑體",
  "noto-sans-kr": "思源黑體 韓文", "noto-serif-kr": "思源宋體 韓文",
  "noto-naskh-arabic": "Noto Naskh 阿拉伯",
};

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

const env = existsSync(".env.local") ? loadEnv() : process.env;
const DB_URL = env.SUPABASE_DB_URL || process.env.SUPABASE_DB_URL;
if (!DB_URL) { console.error("❌ SUPABASE_DB_URL not set"); process.exit(1); }

const client = new pg.Client({ connectionString: DB_URL });
await client.connect();

let ok = 0, google = 0, manual = 0;
for (let i = 0; i < CATALOG.length; i++) {
  const f = CATALOG[i];
  const cssUrl = f.manual ? null : gf(f.gfFamily, f.gfWeights);
  const enabled = !f.manual; // Google 供檔的直接可用；佔位的等上傳
  const previewText = f.langs.includes("zh-Hant") ? "雪隅是一座會長大的島" : "The quick brown fox 0123";
  await client.query(
    `insert into public.fonts
       (family, display_name, slug, category, supported_languages, weights, styles, preview_text,
        file_manifest, subset_strategy, fallback_stack, css_url, enabled, sort_order, updated_at)
     values ($1,$2,$3,$4,$5,$6,'{normal}',$7,'{}'::jsonb,$8,$9,$10,$11,$12, now())
     on conflict (slug) do update set
       family=excluded.family, display_name=excluded.display_name, category=excluded.category,
       supported_languages=excluded.supported_languages, weights=excluded.weights,
       preview_text=excluded.preview_text, subset_strategy=excluded.subset_strategy,
       fallback_stack=excluded.fallback_stack, css_url=excluded.css_url,
       sort_order=excluded.sort_order, updated_at=now()`,
    // 注意：do update 不覆寫 enabled / file_manifest —— 若管理員已上傳/停用過，保留其狀態
    [f.family, ZH[f.slug] ?? f.family, f.slug, f.category, f.langs, f.weights, previewText,
     cssUrl ? "unicode_range" : "static", f.fallback, cssUrl, enabled, i],
  );
  ok++;
  if (f.manual) { manual++; console.log(`  ⏳ ${f.slug}  （佔位，待上傳）`); }
  else { google++; console.log(`  ✅ ${f.slug}  → Google Fonts`); }
}

console.log(`\n📊 ${ok} 支：${google} 支 Google 內建即用 / ${manual} 支佔位待上傳`);
await client.end();
