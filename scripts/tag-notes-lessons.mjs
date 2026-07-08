// 筆記標到 lesson（林董：筆記章節也要細到 ch26.5，點進去帶到該觀念）。
// 對每則「有 chapter_id、沒 lesson_id」的筆記，在該章的課裡找標題最相符的一課；
// 高精準才標（共享關鍵詞夠多且明顯勝出），不確定就維持章級——不亂標。
// 用法：node scripts/tag-notes-lessons.mjs [--write]
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

function loadEnv() {
  const env = {};
  if (existsSync(".env.local")) for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/); if (!m) continue;
    let v = m[2].trim(); if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1);
    env[m[1]] = v;
  }
  return env;
}
const env = loadEnv();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const WRITE = process.argv.includes("--write");

// 從標題抽「有意義的關鍵詞」：英文字詞(>=2)、CJK 連續段(>=2字)切成 bi-gram + 整段
const STOP = new Set(["入門", "基礎", "完整", "教學", "介紹", "怎麼", "如何", "什麼", "這個", "一個", "使用", "的", "與", "和", "跟"]);
function keywords(s) {
  const out = new Set();
  const low = (s || "").toLowerCase();
  for (const m of low.matchAll(/[a-z][a-z0-9+#.]{1,}/g)) if (m[0].length >= 2) out.add(m[0]); // 英文詞（含 sqlalchemy / f-string / base64）
  for (const seg of (s || "").match(/[一-鿿]{2,}/g) ?? []) {
    if (!STOP.has(seg)) out.add(seg);
    for (let i = 0; i + 2 <= seg.length; i++) { const bg = seg.slice(i, i + 2); if (!STOP.has(bg)) out.add(bg); }
  }
  return out;
}
function score(noteKw, lessonTitle) {
  const lk = keywords(lessonTitle);
  let hits = 0, strong = 0;
  for (const k of noteKw) if (lk.has(k)) { hits++; if (/[a-z]/.test(k) && k.length >= 3) strong++; } // 英文技術詞命中加權
  return hits + strong * 1.5;
}

// 撈需要標的筆記（有 chapter、無 lesson）
const NOTES = [];
{
  let from = 0;
  while (true) {
    const { data } = await sb.from("notes").select("id,title,tags,chapter_id,lesson_id").not("chapter_id", "is", null).is("lesson_id", null).range(from, from + 999);
    if (!data || data.length === 0) break;
    NOTES.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
}
console.log("待標筆記(有章無課):", NOTES.length);

// 每章 lessons 快取
const lessonCache = new Map();
async function lessonsOf(ch) {
  if (lessonCache.has(ch)) return lessonCache.get(ch);
  const { data } = await sb.from("lessons").select("id,title").eq("chapter_id", ch).order("sort_order");
  const arr = data ?? [];
  lessonCache.set(ch, arr);
  return arr;
}

let matched = 0, kept = 0, updated = 0;
const preview = [];
for (const n of NOTES) {
  const lessons = await lessonsOf(n.chapter_id);
  if (lessons.length === 0) { kept++; continue; }
  const nk = keywords(`${n.title ?? ""} ${(n.tags ?? []).join(" ")}`);
  if (nk.size === 0) { kept++; continue; }
  let best = null, bestScore = 0, second = 0;
  for (const l of lessons) {
    const s = score(nk, l.title);
    if (s > bestScore) { second = bestScore; bestScore = s; best = l; }
    else if (s > second) { second = s; }
  }
  // 高精準門檻：最佳分 >= 3、且明顯勝過第二名（差 >= 2 或第二名為 0）
  if (best && bestScore >= 3 && (bestScore - second >= 2 || second === 0)) {
    matched++;
    preview.push(`  ch${n.chapter_id}/${best.id}  「${n.title}」 → ${best.title}  [${bestScore.toFixed(1)}]`);
    if (WRITE) {
      const { error } = await sb.from("notes").update({ lesson_id: best.id }).eq("id", n.id);
      if (!error) updated++;
    }
  } else kept++;
}
console.log(preview.slice(0, 60).join("\n"));
if (preview.length > 60) console.log(`  …(還有 ${preview.length - 60} 筆)`);
console.log(`\n📊 ${WRITE ? "已標" : "DRY 可標"} ${WRITE ? updated : matched}、維持章級 ${kept}`);
process.exit(0);
