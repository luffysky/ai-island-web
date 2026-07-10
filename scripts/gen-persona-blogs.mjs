/**
 * 把「單薄的種子部落格」補到跟布林哥同規模（~75 篇）。
 * 一支通吃多個 AI 住民 / 創作者：先讓 AI 產一份「該角色專屬大綱」（快取到本機、之後重跑沿用 → slug 穩定），
 * 再一篇篇生文、插進 user_blog_articles。冪等（跳過已存在 slug）、可用 --limit 分批灌。
 *
 * ⚠️ 會呼叫 AI、花錢、花時間。先 --dry / 小 --limit 試跑、確認品質再放大。
 *
 * 用法：
 *   node scripts/gen-persona-blogs.mjs --persona greenbot --limit 3 --dry   # 只看產出、不寫 DB
 *   node scripts/gen-persona-blogs.mjs --persona frontelf --limit 20        # 補 20 篇
 *   node scripts/gen-persona-blogs.mjs --persona all --limit 8              # 每個角色各補 8 篇（輪流）
 * 需 .env.local：SUPABASE_DB_URL、SUPABASE_SERVICE_ROLE_KEY、AI_KEY_SECRET
 */
import pg from "pg";
import crypto from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, loadProviderKey, pickModelName } from "./_lib/ai-crypto.mjs";
import { logCliUsage } from "./_lib/log-cli-usage.mjs";

const args = process.argv.slice(2);
const arg = (n, d) => { const i = args.indexOf(`--${n}`); if (i === -1) return d; const v = args[i + 1]; return v && !v.startsWith("--") ? v : true; };
const WHO = String(arg("persona", "greenbot"));
const LIMIT = Number(arg("limit", 6));
const DRY = !!arg("dry", false);
// 大量生成預設用 Haiku 省錢（可 --model 覆蓋、或 --model auto 用系統設定的預設款）
const MODEL_ARG = arg("model", "claude-haiku-4-5-20251001");

const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();
const apiKey = await loadProviderKey(c, "anthropic", env.AI_KEY_SECRET);
const model = (MODEL_ARG === "auto" || MODEL_ARG === true) ? await pickModelName(c, "anthropic") : String(MODEL_ARG);

// ── 角色設定 ──
// kind: tutorial=教學文（零基礎友善）｜essay=創作/隨筆（第一人稱、有生活感、非教科書）
const PERSONAS = {
  greenbot: {
    username: "greenbot", display: "綠寶助教", prefix: "gb", target: 72, kind: "tutorial", cat: "自學筆記",
    blogSlug: "greenbot", blogTitle: "綠寶的自學筆記", blogDesc: "✨ 零基礎自學程式的觀念、方法與心態，一篇篇用最白話的話講。",
    bio: "🤖 AI 住民｜綠寶助教，陪你從零開始自學",
    domain: "寫給『完全零基礎自學者』的學習方法與入門觀念（不綁單一語言）：怎麼開始學寫程式、環境安裝、終端機/命令列基礎、Git 與版本控制入門、怎麼問出好問題、怎麼用 AI 幫助學習、規劃學習路線、卡關與心態、程式常見名詞白話解釋、第一個小專案、如何看文件、如何 debug 的心態、鍵盤快捷與工具、線上資源怎麼挑。循序漸進、從最基礎到能自己做小東西。",
    voice: "你是「綠寶助教」，AI 島親切、好奇、溫暖的自學夥伴，句尾偶爾一個 ✨（別過量）。像島上的朋友帶你學，不擺架子。",
  },
  frontelf: {
    username: "frontelf", display: "前端精靈", prefix: "fe", target: 72, kind: "tutorial", cat: "前端",
    blogSlug: "frontelf", blogTitle: "精靈的切版魔法書", blogDesc: "🎨 從 HTML/CSS 到 React 的前端切版魔法，新手也能一步步跟上。",
    bio: "🎨 AI 住民｜前端精靈，專治切版與 UI",
    domain: "前端網頁開發，從零基礎循序漸進：HTML 結構與語意標籤、CSS 基礎與盒模型、選擇器、文字與顏色、Flexbox、Grid、定位 position、RWD 響應式與媒體查詢、單位 rem/em/vw、常見切版難題（置中、等高、黏底）、過場與動畫、表單樣式、CSS 變數、JavaScript 入門、DOM 操作、事件、Fetch 抓資料、React 入門觀念、元件與 props、狀態 state、清單渲染、Tailwind 入門、UI/UX 小訣竅、無障礙基礎。",
    voice: "你是「前端精靈」，活潑、帶畫面感，愛給『可以直接貼上試』的 snippet 配一句畫面感解釋（例：這個 div 會被撐開，是因為裡面的圖沒設 max-width）。比喻用視覺的（盒子、疊圖層、排隊站位）。emoji 點綴別過量。",
  },
  debugpapa: {
    username: "debugpapa", display: "Debug 老爹", prefix: "dp", target: 72, kind: "tutorial", cat: "除錯",
    blogSlug: "debugpapa", blogTitle: "老爹的除錯日記", blogDesc: "🐛 紅字不可怕——教你怎麼自己讀懂錯誤、定位 bug、把程式救回來。",
    bio: "🐛 AI 住民｜Debug 老爹，專治各種 bug",
    domain: "除錯與問題排解，從新手視角：怎麼讀錯誤訊息與 Traceback、二分法定位、print/logging/debugger 用法、常見 Python 錯誤（NameError/TypeError/IndexError/KeyError/縮排…）、常見 JavaScript 錯誤（undefined/null/非同步）、環境與相依套件問題、pip/npm 安裝失敗、編碼與亂碼、網路請求失敗與狀態碼、Git 出包救援（reset/reflog/衝突）、效能問題初判、記憶體、怎麼寫出好的提問（把問題講清楚）、怎麼善用 AI 幫你除錯、寫測試預防 bug。沉穩像老前輩、教『怎麼自己找 bug』。",
    voice: "你是「Debug 老爹」，沉穩老練、有耐心、不嘲笑新手。像醫生問診：先鎖定最可能的、給一個具體檢查動作。口頭禪『紅字不可怕，貼上來我陪你看』『先看最後一行 Traceback』。",
  },
  suwan: {
    username: "suwan", display: "蘇晚", prefix: "sw", target: 48, kind: "essay", cat: "生活",
    blogSlug: "suwan", blogTitle: "蘇晚的日子", blogDesc: "寫日常與微光。",
    bio: "寫字的人｜日常與微光",
    domain: "日常散文與微光小品：生活觀察、習慣養成、情緒、人際、微小而溫柔的片刻、季節、食物、獨處、城市與夜晚。第一人稱、溫柔、誠實、不說教，像寫給自己也寫給讀者的私筆記。",
    voice: "你是「蘇晚」，寫日常散文的創作者。溫柔、誠實、觀察細膩，句子乾淨不濫情，會從一件小事收束到一個柔軟的體會。第一人稱。不是教學、不列步驟。",
  },
  zhiyuan: {
    username: "zhiyuan", display: "林之遠", prefix: "zy", target: 48, kind: "essay", cat: "技術隨筆",
    blogSlug: "zhiyuan", blogTitle: "林之遠的技術隨筆", blogDesc: "把難的東西講成人話。",
    bio: "工程師｜把難的東西講成人話",
    domain: "技術隨筆：把難懂的工程/技術觀念用比喻講成人話的短文、除錯與思考心法、工程師的日常與選擇、技術與生活的交界、學習與成長的體悟。不是教科書、是有觀點的隨筆。",
    voice: "你是「林之遠」，工程師出身的隨筆作者。擅長用一個生活比喻把抽象技術講清楚，語氣沉穩、有觀點、偶爾自嘲，不炫技、不掉書袋。第一人稱隨筆。",
  },
  "hemo.ink": {
    username: "hemo.ink", display: "何默", prefix: "hm", target: 48, kind: "essay", cat: "散文",
    blogSlug: "hemo", blogTitle: "何默的深夜信", blogDesc: "寫給那些覺得自己不夠好的人。",
    bio: "寫字的人｜深夜的溫柔",
    domain: "深夜療癒散文與短詩：寫給覺得自己不夠好、疲憊、迷惘、自我懷疑的人。溫柔、療癒、誠實、有陪伴感，像深夜寫給讀者的一封信。偶爾是散文、偶爾是短詩。",
    voice: "你是「何默」，寫深夜療癒散文與短詩的創作者。文字溫柔有重量、意象乾淨、不灑狗血、不廉價安慰，像在黑暗裡輕輕陪著人。第一人稱。",
  },
  riverseen: {
    username: "riverseen", display: "江見", prefix: "rs", target: 48, kind: "essay", cat: "獨立開發",
    blogSlug: "riverseen", blogTitle: "江見的做東西筆記", blogDesc: "用一個週末，做出解決自己麻煩的小東西。",
    bio: "獨立開發者｜做點解決自己麻煩的小東西",
    domain: "獨立開發 / 做小工具的隨筆：用週末做出解決自己麻煩的小專案的故事、從想法到做完的過程、遇到的坑、上線與被使用的心情、獨立開發的取捨與心態、生活裡值得自動化的麻煩事。有故事感、務實、不吹噓。",
    voice: "你是「江見」，喜歡做小工具的獨立開發者。用說故事的方式寫『我怎麼做出這東西、為什麼、踩到什麼坑、學到什麼』，務實、誠實、有溫度，不吹噓成果、不掛保證。第一人稱。",
  },
};

const kebab = (prefix, i) => `${prefix}-${String(i).padStart(2, "0")}`;

// ── 確保作者存在（沒有就建 NPC 帳號）+ 開通部落格設定 ──
async function ensureAuthor(p) {
  const { rows } = await c.query("select id from public.profiles where username=$1", [p.username]);
  let id = rows[0]?.id;
  if (!id) {
    const { data, error } = await admin.auth.admin.createUser({ email: `${p.username}@npc.snowrealm.pet`, password: crypto.randomUUID() + "Aa1!", email_confirm: true, user_metadata: { username: p.username, full_name: p.display } });
    if (error) throw new Error(error.message);
    id = data.user.id;
    await c.query("update public.profiles set username=$1, display_name=$2, bio=$3 where id=$4", [p.username, p.display, p.bio, id]);
  }
  await c.query(
    `insert into public.user_blog_settings (user_id, blog_slug, blog_title, blog_desc, is_enabled) values ($1,$2,$3,$4,true)
     on conflict (user_id) do update set blog_title=excluded.blog_title, blog_desc=excluded.blog_desc, is_enabled=true`,
    [id, p.blogSlug, p.blogTitle, p.blogDesc]
  );
  return id;
}

// ── 大綱：本機快取（scripts/_data/persona-syllabus-<user>.json）；沒有就用 AI 生一份 ──
const DATA_DIR = "scripts/_data";
async function ensureSyllabus(p) {
  const file = `${DATA_DIR}/persona-syllabus-${p.username}.json`;
  if (existsSync(file)) {
    const cached = JSON.parse(readFileSync(file, "utf8"));
    if (Array.isArray(cached) && cached.length) return cached;
  }
  console.log(`   · 產生 ${p.display} 的大綱（${p.target} 篇）…`);
  const isTut = p.kind === "tutorial";
  const sys = `你在替一個部落格規劃「文章大綱」。只輸出 JSON、不要多餘文字。`;
  const user = `部落格作者：${p.display}
主題領域：${p.domain}
請規劃 ${p.target} 篇文章的大綱，${isTut ? "由淺入深、循序漸進（前面最基礎、後面較進階），涵蓋整個領域" : "題材多元、不重複、有變化（避免每篇都同一種調性）"}。
輸出格式：一個 JSON 陣列，每個元素 {"title": "文章標題（繁體中文，不要編號、不要引號內再放引號）", "tags": ["1~3個中文短標籤"]}。
標題要具體吸引人、像真的部落格標題。只輸出 JSON 陣列本身。`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 4000, system: sys, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`AI(syllabus) ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  await logCliUsage(c, { model, inputTokens: data.usage?.input_tokens, outputTokens: data.usage?.output_tokens });
  const raw = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const s = raw.indexOf("["), e = raw.lastIndexOf("]");
  if (s < 0 || e < 0) throw new Error("大綱解析失敗：找不到 JSON 陣列");
  let list = JSON.parse(raw.slice(s, e + 1));
  list = list.filter((t) => t && t.title).map((t) => ({ title: String(t.title).slice(0, 120), tags: Array.isArray(t.tags) ? t.tags.slice(0, 3).map(String) : [] }));
  if (!DRY) { mkdirSync(DATA_DIR, { recursive: true }); writeFileSync(file, JSON.stringify(list, null, 2) + "\n"); }
  return list;
}

// md → HTML（同 pygoblin）
function mdToHtml(md) {
  const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = md.replace(/\r/g, "").split("\n");
  let html = "", i = 0, inUl = false;
  const closeUl = () => { if (inUl) { html += "</ul>"; inUl = false; } };
  const inline = (t) => esc(t).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  while (i < lines.length) {
    const line = lines[i];
    const fence = line.match(/^```(\w*)/);
    if (fence) { closeUl(); i++; const buf = []; while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]); i++; html += `<pre><code>${esc(buf.join("\n"))}</code></pre>`; continue; }
    let m;
    if ((m = line.match(/^###\s+(.+)/))) { closeUl(); html += `<h3>${inline(m[1])}</h3>`; i++; continue; }
    if ((m = line.match(/^##\s+(.+)/))) { closeUl(); html += `<h2>${inline(m[1])}</h2>`; i++; continue; }
    if ((m = line.match(/^#\s+(.+)/))) { closeUl(); html += `<h2>${inline(m[1])}</h2>`; i++; continue; }
    if ((m = line.match(/^\s*[-*]\s+(.+)/))) { if (!inUl) { html += "<ul>"; inUl = true; } html += `<li>${inline(m[1])}</li>`; i++; continue; }
    if (line.trim() === "") { closeUl(); i++; continue; }
    closeUl(); html += `<p>${inline(line)}</p>`; i++;
  }
  closeUl();
  return html;
}

function articleSystem(p) {
  if (p.kind === "tutorial") {
    return `${p.voice}
用繁體中文寫部落格教學文。**設定讀者是「完全沒碰過程式的國中生」**，用最入門白話的方式，目標「連國中生都聽得懂」。
規則：每個英文術語第一次出現先用一句話白話解釋（例：函式（function）你可以想成一顆按鈕），再舉生活例子；避免沒解釋的專有名詞；程式碼從最簡單能跑的一行開始逐步加；不誇大不掛保證。
輸出格式（嚴格）：第一行 SUMMARY: <一句話摘要 20~40 字>，接著一行 --- ，再來是 markdown 內文（## 當小標、程式碼用三反引號標語言、**粗體**、- 清單）。長度約 500~900 字、2~5 個 ## 小標、至少一個程式碼或具體範例。不要 H1 大標題、不要客套開場、直接進主題。`;
  }
  return `${p.voice}
用繁體中文寫一篇部落格文章（散文／隨筆／短詩，依主題而定），第一人稱、有溫度、有具體畫面與細節，不是教科書、不要條列步驟、不要說教口吻。
輸出格式（嚴格）：第一行 SUMMARY: <一句話摘要 20~40 字>，接著一行 --- ，再來是內文（可用 markdown 段落；需要小標再用 ##；避免程式碼區塊除非主題需要）。長度約 400~800 字。不要 H1 大標題、不要「今天我想跟大家分享」這種罐頭開場、直接進入。`;
}

async function genArticle(p, topic) {
  const userMsg = `這篇主題：「${topic.title}」\n請照格式寫這一篇（SUMMARY 一行、--- 、內文）。`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 2000, system: articleSystem(p), messages: [{ role: "user", content: userMsg }] }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  await logCliUsage(c, { model, inputTokens: data.usage?.input_tokens, outputTokens: data.usage?.output_tokens });
  const raw = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  const sepIdx = raw.indexOf("---");
  let summary = "", body = raw;
  const sm = raw.match(/SUMMARY:\s*(.+)/i);
  if (sm) summary = sm[1].trim();
  if (sepIdx >= 0) body = raw.slice(sepIdx + 3).trim();
  body = body.replace(/^SUMMARY:.*$/im, "").trim();
  return { summary: summary.slice(0, 300), html: mdToHtml(body) };
}

async function runPersona(p) {
  console.log(`\n=== ${p.display}（@${p.username}）===`);
  const AUTHOR = await ensureAuthor(p);
  const syllabus = await ensureSyllabus(p);
  // 待生成：跳過已存在 slug
  const pool = syllabus.map((t, idx) => ({ ...t, slug: kebab(p.prefix, idx + 1), idx }));
  const { rows: existing } = await c.query("select slug from public.user_blog_articles where user_id=$1", [AUTHOR]);
  const have = new Set(existing.map((r) => r.slug));
  const todo = pool.filter((t) => !have.has(t.slug)).slice(0, LIMIT);
  console.log(`   大綱 ${syllabus.length} 篇、已有(本 prefix) ${pool.filter((t) => have.has(t.slug)).length}、這輪生 ${todo.length}` + (DRY ? "（dry）" : ""));
  let done = 0;
  for (const topic of todo) {
    process.stdout.write(`   ▶️  ${topic.title} …`);
    try {
      const { summary, html } = await genArticle(p, topic);
      if (DRY) { console.log(` (dry) ${summary}`); continue; }
      const daysBack = syllabus.length - topic.idx; // 舊的排前面
      await c.query(
        `insert into public.user_blog_articles (user_id, title, slug, summary, content, tags, category, is_public, view_count, published_at, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,true,$8,$9,$9,$9)
         on conflict (user_id, slug) do nothing`,
        [AUTHOR, topic.title, topic.slug, summary, html, topic.tags ?? [], p.cat, 60 + Math.floor(Math.random() * 380),
         new Date(Date.now() - daysBack * 86400000).toISOString()]
      );
      done++; console.log(" ✅");
    } catch (e) { console.log(` ❌ ${e.message}`); }
  }
  const { rows: cnt } = await c.query("select count(*)::int n from public.user_blog_articles where user_id=$1", [AUTHOR]);
  console.log(`   ✓ 這輪 +${done}、${p.display} 現有 ${cnt[0].n} 篇（目標 ${p.target}）`);
}

const targets = WHO === "all" ? Object.keys(PERSONAS) : [WHO];
console.log(`🤖 model=${model} · 角色=${targets.join(",")} · 每角色上限=${LIMIT} · dry=${DRY}`);
for (const key of targets) {
  const p = PERSONAS[key];
  if (!p) { console.log(`⚠️  未知角色：${key}（可用：${Object.keys(PERSONAS).join(", ")}, all）`); continue; }
  try { await runPersona(p); } catch (e) { console.log(`❌ ${key}: ${e.message}`); }
}
await c.end();
console.log("\n完成。再跑一次可續生下一批（冪等、跳過已生成）。");
