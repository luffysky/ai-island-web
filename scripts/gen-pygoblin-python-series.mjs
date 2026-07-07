/**
 * 生成「Python 哥布林」的大量部落格系列文（入門 → 進階 → 爬蟲 → 資料處理 → 機器學習 → 深度學習）。
 * 用系統 AI key 生成、以初學者角度、繁中；插進 user_blog_articles（作者=pygoblin）+ blog_series 分系列。
 *
 * ⚠️ 會呼叫 AI、花錢、花時間。先用小 --limit 試跑、確認品質再放大。可重複跑（自動跳過已生成的 slug）→ 分批灌到 75 篇。
 *
 * 用法：
 *   node scripts/gen-pygoblin-python-series.mjs --limit 6           # 先生 6 篇試水溫
 *   node scripts/gen-pygoblin-python-series.mjs --limit 40          # 一次多生一點
 *   node scripts/gen-pygoblin-python-series.mjs --series crawler    # 只生某系列
 *   node scripts/gen-pygoblin-python-series.mjs --limit 3 --dry     # 只看產出、不寫 DB
 * 需 .env.local：SUPABASE_DB_URL、SUPABASE_SERVICE_ROLE_KEY、AI_KEY_SECRET
 */
import pg from "pg";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadEnv, loadProviderKey, pickModelName } from "./_lib/ai-crypto.mjs";
import { logCliUsage } from "./_lib/log-cli-usage.mjs";

const args = process.argv.slice(2);
const arg = (n, d) => { const i = args.indexOf(`--${n}`); if (i === -1) return d; const v = args[i + 1]; return v && !v.startsWith("--") ? v : true; };
const LIMIT = Number(arg("limit", 6));
const ONLY_SERIES = arg("series", null);
const DRY = !!arg("dry", false);

const env = loadEnv();
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();
const apiKey = await loadProviderKey(c, "anthropic", env.AI_KEY_SECRET);
const model = await pickModelName(c, "anthropic");

// ── 作者：pygoblin（沒有就現建）──
async function ensurePygoblin() {
  const { rows } = await c.query("select id from public.profiles where username = 'pygoblin'");
  let id = rows[0]?.id;
  if (!id) {
    const { data, error } = await admin.auth.admin.createUser({ email: "pygoblin@npc.snowrealm.pet", password: crypto.randomUUID() + "Aa1!", email_confirm: true, user_metadata: { username: "pygoblin", full_name: "Python 哥布林" } });
    if (error) throw new Error(error.message);
    id = data.user.id;
    await c.query("update public.profiles set username='pygoblin', display_name='Python 哥布林', bio=$2 where id=$1", [id, "🤖 AI 住民｜Python、爬蟲、自動化、資料、ML"]);
  }
  await c.query(`insert into public.user_blog_settings (user_id, blog_slug, blog_title, blog_desc, is_enabled) values ($1,'pygoblin','哥布林的 Python 小抄','🐍 從零到機器學習：入門、爬蟲、資料處理、ML/DL，一篇篇用新手聽得懂的話講。',true) on conflict (user_id) do update set blog_title=excluded.blog_title, blog_desc=excluded.blog_desc, is_enabled=true`, [id]);
  return id;
}
const AUTHOR = await ensurePygoblin();

// ── 系列 + 大綱（75 篇）──
const SERIES = {
  intro:      { title: "Python 入門系列", cat: "Python 入門" },
  advanced:   { title: "Python 進階系列", cat: "Python 進階" },
  crawler:    { title: "Python 爬蟲系列", cat: "爬蟲" },
  data:       { title: "Python 資料處理系列", cat: "資料處理" },
  ml:         { title: "機器學習入門系列", cat: "機器學習" },
  dl:         { title: "深度學習入門系列", cat: "深度學習" },
};
const T = (series, title, tags) => ({ series, title, tags });
const SYLLABUS = [
  // 入門 15
  T("intro","安裝 Python 與寫下第一支程式",["安裝","新手"]), T("intro","變數：貼標籤的盒子",["變數"]), T("intro","數字與運算：整數、浮點數、餘數",["運算"]),
  T("intro","字串：文字怎麼存、怎麼組",["字串"]), T("intro","list 清單：一排格子裝東西",["list"]), T("intro","dict 字典：用鑰匙查值",["dict"]),
  T("intro","tuple 與 set：不可變與去重",["tuple","set"]), T("intro","if / elif / else：讓程式會判斷",["條件"]), T("intro","for 迴圈：重複做同一件事",["迴圈"]),
  T("intro","while 迴圈與 break / continue",["迴圈"]), T("intro","函式：把步驟打包成一顆按鈕",["函式"]), T("intro","參數、回傳值與預設值",["函式"]),
  T("intro","例外處理 try / except：讓程式不崩",["例外"]), T("intro","讀寫檔案：把資料存下來",["檔案"]), T("intro","初學者常犯的 10 個錯",["新手","踩雷"]),
  // 進階 12
  T("advanced","推導式 comprehension：一行寫迴圈",["推導式"]), T("advanced","lambda 與 map / filter / sorted",["函式式"]), T("advanced","裝飾器 decorator 是什麼",["裝飾器"]),
  T("advanced","生成器 yield：省記憶體的迭代",["生成器"]), T("advanced","物件導向 class 入門",["OOP"]), T("advanced","繼承與多型",["OOP"]),
  T("advanced","魔術方法 __init__ / __str__ 等",["OOP"]), T("advanced","模組、套件與 import",["模組"]), T("advanced","虛擬環境 venv 與 pip",["環境"]),
  T("advanced","型別註記 typing 讓 code 更清楚",["typing"]), T("advanced","好用的標準庫：os / json / datetime",["標準庫"]), T("advanced","寫出 Pythonic 的 code",["風格"]),
  // 爬蟲 12
  T("crawler","requests 入門：抓一個網頁",["爬蟲","requests"]), T("crawler","HTTP 狀態碼與 headers",["HTTP"]), T("crawler","BeautifulSoup 解析 HTML",["BeautifulSoup"]),
  T("crawler","CSS 選擇器抓到你要的元素",["選擇器"]), T("crawler","分頁爬取與迴圈翻頁",["爬蟲"]), T("crawler","表單與 POST 請求",["POST"]),
  T("crawler","反爬蟲：User-Agent 與延遲",["反爬"]), T("crawler","動態網頁與 Selenium",["Selenium"]), T("crawler","直接打 API 更省事",["API"]),
  T("crawler","爬蟲禮貌：robots.txt 與速率",["禮貌"]), T("crawler","把爬到的資料存成 CSV",["CSV"]), T("crawler","實戰：爬一個新聞列表",["實戰"]),
  // 資料處理 12
  T("data","pandas 入門：資料界的 Excel",["pandas"]), T("data","DataFrame 與 Series 基礎",["pandas"]), T("data","讀寫 CSV / Excel",["pandas"]),
  T("data","篩選、排序、選欄位",["pandas"]), T("data","groupby 分組彙總",["pandas"]), T("data","合併資料 merge / concat",["pandas"]),
  T("data","缺失值處理",["pandas"]), T("data","apply 與自訂運算",["pandas"]), T("data","日期時間處理",["pandas"]),
  T("data","樞紐分析 pivot_table",["pandas"]), T("data","numpy 陣列入門",["numpy"]), T("data","matplotlib 畫出你的資料",["視覺化"]),
  // 機器學習 12
  T("ml","什麼是機器學習（給完全新手）",["ML","觀念"]), T("ml","scikit-learn 入門",["sklearn"]), T("ml","特徵與標籤是什麼",["ML"]),
  T("ml","訓練集 / 測試集切分",["ML"]), T("ml","線性回歸：預測數值",["回歸"]), T("ml","邏輯回歸：做分類",["分類"]),
  T("ml","決策樹與隨機森林",["樹"]), T("ml","KNN 最近鄰",["KNN"]), T("ml","評估指標：準確率、precision、recall",["評估"]),
  T("ml","過擬合與如何避免",["ML"]), T("ml","特徵工程入門",["特徵"]), T("ml","實戰：鐵達尼生還預測",["實戰"]),
  // 深度學習 12
  T("dl","神經網路的直覺理解",["DL","觀念"]), T("dl","張量 tensor 是什麼",["DL"]), T("dl","PyTorch 入門",["PyTorch"]),
  T("dl","建第一個神經網路",["PyTorch"]), T("dl","損失函數與優化器",["DL"]), T("dl","訓練迴圈怎麼跑",["DL"]),
  T("dl","CNN 卷積網路處理影像",["CNN"]), T("dl","RNN 與序列資料",["RNN"]), T("dl","遷移學習：站在巨人肩膀上",["遷移學習"]),
  T("dl","過擬合與正則化（DL 篇）",["DL"]), T("dl","用 GPU 加速訓練",["GPU"]), T("dl","實戰：手寫數字辨識 MNIST",["實戰"]),
];

const kebab = (s, i) => `pg-${s}-${String(i).padStart(2, "0")}`;

// 每系列建一筆 blog_series（沒有就建），回 id map
const seriesId = {};
for (const [key, s] of Object.entries(SERIES)) {
  const { rows } = await c.query("select id from public.blog_series where user_id=$1 and title=$2", [AUTHOR, s.title]);
  if (rows[0]) seriesId[key] = rows[0].id;
  else if (!DRY) {
    const { rows: ins } = await c.query("insert into public.blog_series (user_id, title, description) values ($1,$2,$3) returning id", [AUTHOR, s.title, `Python 哥布林的「${s.title}」，從新手角度一篇篇帶。`]);
    seriesId[key] = ins[0].id;
  }
}

// md → 簡易 HTML（標題/段落/清單/程式碼/粗體/行內碼）
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

const SYSTEM = `你是「Python 哥布林」，AI 島的 Python 教學夥伴，用繁體中文寫部落格文章。
**設定讀者是「完全沒碰過程式的國中生」**，用最入門、最白話的方式寫，目標是「連國中生都聽得懂」。
規則：每個英文術語第一次出現，先用一句話白話解釋（例：「函式（function），你可以想成一顆按鈕」），再舉一個生活例子；避免任何沒解釋的專有名詞；程式碼從最最簡單、能跑的一行開始，逐步加；口語像學長姐帶學弟妹、多用「你有沒有遇過…」的反問；不誇大不掛保證、偶爾一句 🐍。
輸出格式（嚴格）：
第一行： SUMMARY: <這篇一句話摘要，20~40 字>
接著一行： ---
再來是文章本體，用 markdown：用 ## 當小標、程式碼用三個反引號包（標 python）、重點用 **粗體**、可用 - 清單。
文章長度約 500~900 字，2~5 個 ## 小標，至少一個程式碼範例。不要有 H1 大標題（標題我另外放）。不要客套開場白，直接進主題。`;

async function genArticle(topic) {
  const seriesTitle = SERIES[topic.series].title;
  const userMsg = `系列：${seriesTitle}\n這篇主題：「${topic.title}」\n請照格式寫這一篇（SUMMARY 一行、--- 、markdown 內文）。`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 2000, system: SYSTEM, messages: [{ role: "user", content: userMsg }] }),
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

// 待生成：跳過已存在 slug
let pool = SYLLABUS.map((t, idx) => ({ ...t, idx, slug: kebab(t.series, SYLLABUS.filter((x, j) => x.series === t.series && j <= idx).length) }));
if (ONLY_SERIES) pool = pool.filter((t) => t.series === ONLY_SERIES);
const { rows: existing } = await c.query("select slug from public.user_blog_articles where user_id=$1", [AUTHOR]);
const have = new Set(existing.map((r) => r.slug));
pool = pool.filter((t) => !have.has(t.slug)).slice(0, LIMIT);

console.log(`🤖 model=${model} · 待生成 ${pool.length} 篇（總大綱 ${SYLLABUS.length}、已有 ${have.size}）· dry=${DRY}\n`);

let done = 0;
for (const topic of pool) {
  process.stdout.write(`▶️  [${SERIES[topic.series].cat}] ${topic.title} …`);
  try {
    const { summary, html } = await genArticle(topic);
    if (DRY) { console.log(` (dry) ${summary}`); continue; }
    const orderInSeries = SYLLABUS.filter((x, j) => x.series === topic.series && j <= topic.idx).length;
    const daysBack = SYLLABUS.length - topic.idx; // 舊的排前面
    await c.query(
      `insert into public.user_blog_articles (user_id, title, slug, summary, content, tags, category, is_public, view_count, series_id, series_order, published_at, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,true,$8,$9,$10,$11,$11,$11)
       on conflict (user_id, slug) do nothing`,
      [AUTHOR, topic.title, topic.slug, summary, html, topic.tags ?? [], SERIES[topic.series].cat,
       120 + Math.floor(Math.random() * 400), seriesId[topic.series] ?? null, orderInSeries,
       new Date(Date.now() - daysBack * 86400000).toISOString()]
    );
    done++; console.log(" ✅");
  } catch (e) { console.log(` ❌ ${e.message}`); }
}

const { rows: cnt } = await c.query("select count(*)::int n from public.user_blog_articles where user_id=$1", [AUTHOR]);
console.log(`\n✓ 這輪生了 ${done} 篇 · 哥布林部落格現有 ${cnt[0].n} 篇（大綱共 ${SYLLABUS.length}）`);
console.log(DRY ? "（dry run、沒寫 DB）" : "再跑一次可續生下一批直到補滿。");
await c.end();
