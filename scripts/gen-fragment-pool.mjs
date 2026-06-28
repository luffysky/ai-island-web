/**
 * 生成「碎片庫」ci_fragment_pool（目標 10000 句，新島從中抽 300）。
 *
 * 鐵律（寫進 prompt）：每句新鮮具體有畫面、彼此角度不同（不流水）、不敷衍湊數、
 * 稀有度 R/SR/SSR。去重靠 unique index lower(btrim(text)) + ON CONFLICT DO NOTHING。
 *
 * ⚠️ 會呼叫 AI、花錢（預設用便宜的 Haiku）。可重複跑、累積到目標。
 * 用法：
 *   node scripts/gen-fragment-pool.mjs --target 10000
 *   node scripts/gen-fragment-pool.mjs --target 150 --dry     # 只看產出
 *   node scripts/gen-fragment-pool.mjs --target 10000 --model claude-haiku-4-5-20251001
 * 需要 .env.local：SUPABASE_DB_URL、AI_KEY_SECRET
 */
import pg from "pg";
import { loadEnv, loadProviderKey } from "./_lib/ai-crypto.mjs";
import { logCliUsage } from "./_lib/log-cli-usage.mjs";

const args = process.argv.slice(2);
const arg = (n, d) => { const i = args.indexOf(`--${n}`); if (i === -1) return d; const v = args[i + 1]; return v && !v.startsWith("--") ? v : true; };
const TARGET = Number(arg("target", 10000));
const MODEL = String(arg("model", "claude-haiku-4-5-20251001"));
const PER = Number(arg("per", 20));
const DRY = !!arg("dry", false);
const MAX_CALLS = Number(arg("maxcalls", 1200));

const CATS = [
  ["童年", "巷口、老家、長輩、第一次的恐懼與好奇"],
  ["初戀與曖昧", "傳紙條、騎車載人、心跳、欲言又止"],
  ["離別與失去", "搬家、告別式、刪掉的對話、空掉的位置"],
  ["城市夜晚", "便利商店、最後一班車、招牌、加班的窗"],
  ["自然與四季", "梅雨、颱風天、第一道光、落葉、海風"],
  ["夢境與潛意識", "鬼壓床、重複的夢、醒來忘記的、似曾相識"],
  ["家庭與親情", "父母的背影、餐桌、沒說出口的話、老照片"],
  ["友情", "絕交、重逢、群組已讀、那個再也沒聯絡的人"],
  ["工作與職場", "離職信、會議、被已讀、影印機前的人生"],
  ["孤獨", "一個人吃飯、深夜的天花板、群裡的安靜"],
  ["科技與未來", "AI、演算法、被推薦的人生、數位遺物"],
  ["食物與味覺", "媽媽的味道、宵夜、過期、一個人的火鍋"],
  ["旅行與在路上", "機場、迷路、陌生床鋪、回不去的地方"],
  ["音樂與聲音", "副歌、耳機、雨聲、某首歌的那個夏天"],
  ["身體與感官", "疤、白頭髮、體溫、第一次的痛"],
  ["時間與記憶", "舊手機、時間膠囊、忘記、突然想起"],
  ["慾望與金錢", "想要、買不起、第一桶金、帳單"],
  ["信仰與存在", "意義、神、為什麼活著、宇宙的尺度"],
  ["動物", "流浪貓、養老的狗、窗台的鳥、養過的死去"],
  ["節日與儀式", "除夕、生日、跨年倒數、一個人的節日"],
  ["雨與天氣", "等雨停、共撐一把傘、潮濕、霧"],
  ["老去與死亡", "皺紋、遺書、最後一面、墓碑上的破折號"],
  ["陌生人", "電梯、計程車司機、擦肩、只有一面之緣"],
  ["文字與書信", "未寄出的信、簽名、日記、刪除鍵"],
  ["海與水", "退潮、溺、漂流、深海的安靜"],
  ["房間與物件", "舊鑰匙、抽屜深處、搬不走的、別人的房間"],
  ["秘密與謊言", "善意的謊、藏起來的、被發現、雙面"],
  ["光與影", "黃昏、霓虹、影子、停電的夜"],
];

const SYSTEM = `你是頂尖的中文創意總監，為創作者產出「創作碎片」——能點燃創作的原始素材。碎片『不限形式、不一定是完整句子』，可以是：
- 人物：一句速寫一個人。例「總在頂樓抽菸、從不說話的鄰居老兵」
- 地點：例「外婆家那個會回音的米甕」「下午四點的廢棄泳池」
- 物件：例「調不準的收音機」「她沒拆的最後一份禮物」
- 畫面/日常片段：例「公車急煞時所有人同時往前傾」
- 意象/一個詞：例「退潮後沙上的洞」「未接來電 7 通」
- 對話/心聲：例「『你先走，我看一下就來』——他再也沒來」
- 完整的靈感句（也可以，但不要每個都是）
長度幾個字到約 34 字都行。
鐵律：
1) 新鮮、具體、有畫面或張力。嚴禁陳腔濫調、心靈雞湯、勵志格言、湊數廢話。
2) 同一批『形式要混搭』——人物/地點/物件/畫面/意象/對話/詞/句子都要有，不要全是句子，也不要同一句型複製（不流水）。
3) 不敷衍、寧缺勿濫，每個都像精心想過。
4) rarity：R=日常但鮮活；SR=獨特角度；SSR=罕見、深刻或顛覆，讀到會想立刻寫下去。
每個 item 標 form（人物/地點/物件/畫面/意象/對話/詞/句子 之一）。
只回傳「純 JSON 陣列」，不要 markdown、不要多餘文字：
[{"text":"碎片","form":"人物","rarity":"R|SR|SSR","tags":["1-2個關鍵字"]}]
全部繁體中文。`;

const env = loadEnv();
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();
const apiKey = await loadProviderKey(c, "anthropic", env.AI_KEY_SECRET);

async function count() { const { rows } = await c.query("SELECT count(*)::int n FROM ci_fragment_pool"); return rows[0].n; }
async function sampleExisting(cat) {
  const { rows } = await c.query("SELECT text FROM ci_fragment_pool WHERE category=$1 ORDER BY random() LIMIT 10", [cat]);
  return rows.map((r) => r.text);
}

async function genBatch(cat, vibe) {
  const avoid = await sampleExisting(cat);
  const userMsg = `主題領域：「${cat}」（${vibe}）。\n產 ${PER} 個彼此迥異的碎片，形式要混搭（人物/地點/物件/畫面/意象/對話/詞/句子都要有，不要全是句子），約 1 個 SSR、4 個 SR、其餘 R。\n${avoid.length ? `避免與這些重複或太像：\n${avoid.map((t) => "- " + t).join("\n")}` : ""}`;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 2000, temperature: 1, system: SYSTEM, messages: [{ role: "user", content: userMsg }] }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = await res.json();
  await logCliUsage(c, { model: MODEL, inputTokens: data.usage?.input_tokens, outputTokens: data.usage?.output_tokens }).catch(() => {});
  let raw = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  const s = raw.indexOf("["), e = raw.lastIndexOf("]");
  if (s >= 0 && e > s) raw = raw.slice(s, e + 1);
  const arr = JSON.parse(raw);
  return arr.filter((x) => x && typeof x.text === "string" && x.text.trim().length >= 2)
    .map((x) => ({ text: x.text.trim().slice(0, 200), rarity: ["R", "SR", "SSR"].includes(x.rarity) ? x.rarity : "R", tags: [x.form, ...(Array.isArray(x.tags) ? x.tags : [])].filter(Boolean).slice(0, 3) }));
}

async function insertBatch(cat, rows) {
  if (!rows.length || DRY) return 0;
  const vals = [], params = [];
  rows.forEach((r, i) => { const b = i * 4; vals.push(`($${b + 1},$${b + 2},$${b + 3},$${b + 4})`); params.push(r.text, cat, r.rarity, r.tags); });
  const { rowCount } = await c.query(
    `INSERT INTO ci_fragment_pool (text, category, rarity, tags) VALUES ${vals.join(",")} ON CONFLICT (lower(btrim(text))) DO NOTHING`, params);
  return rowCount;
}

let calls = 0, added = 0;
let have = await count();
console.log(`🤖 model=${MODEL} 目標=${TARGET} 目前=${have} dry=${DRY}`);
outer: while (have < TARGET && calls < MAX_CALLS) {
  for (const [cat, vibe] of CATS) {
    if (have >= TARGET || calls >= MAX_CALLS) break outer;
    calls++;
    try {
      const batch = await genBatch(cat, vibe);
      if (DRY) { console.log(`\n── ${cat} ──`); batch.forEach((b) => console.log(`[${b.rarity}] ${b.text}  {${b.tags.join(",")}}`)); }
      const n = await insertBatch(cat, batch);
      added += n; have += n;
      console.log(`#${calls} ${cat}: +${n}（池=${have}）`);
    } catch (e) { console.log(`#${calls} ${cat}: ✗ ${e.message}`); }
  }
}
console.log(`\n✅ 完成：本次新增 ${added}，池總計 ${have}`);
await c.end();
