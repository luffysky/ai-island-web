/**
 * 筆記市集種子：官方帳號(AI 島官方)提供的「免費」開發筆記包（Python / 前端 / 後端）。
 * 每個 pack = 一組 notes（實際筆記內容）+ 一個 note_products（price_z=0 免費、is_active）。
 * 冪等：先刪掉這批（依 seller + category / product 標題）再重鋪，可安全重跑。
 * Usage: node scripts/seed-note-market.mjs
 */
import { readFileSync } from "node:fs";
import crypto from "node:crypto";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split(/\r?\n/).map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, "")]));
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const c = new pg.Client({ connectionString: env.SUPABASE_DB_URL });
await c.connect();

// 官方賣家：ai_island（沒有就現建）
async function ensureOfficial() {
  const { rows } = await c.query("select id from public.profiles where username='ai_island'");
  if (rows[0]) return rows[0].id;
  const { data, error } = await admin.auth.admin.createUser({ email: "ai_island@npc.snowrealm.pet", password: crypto.randomUUID() + "Aa1!", email_confirm: true, user_metadata: { username: "ai_island", full_name: "AI 島官方" } });
  if (error) throw new Error(error.message);
  await c.query("update public.profiles set username='ai_island', display_name='AI 島官方', bio=$2 where id=$1", [data.user.id, "📢 AI 島官方帳號｜公告 · 新手指南 · 免費筆記"]);
  return data.user.id;
}
const SELLER = await ensureOfficial();

const P = (...paras) => paras.map((t) => `<p>${t}</p>`).join("");
const CAT = "官方開發筆記";

// pack：{ product 標題/描述, notes:[{title, content}] }
const PACKS = [
  {
    title: "🐍 Python 開發筆記（官方免費）",
    desc: "從語法速查到爬蟲、資料處理，新手最常翻的 Python 筆記包。免費。",
    notes: [
      { title: "Python 環境與套件管理", content: P("虛擬環境：<code>python -m venv venv</code> → 啟用後 <code>pip install 套件</code>。", "把依賴凍起來：<code>pip freeze > requirements.txt</code>；還原：<code>pip install -r requirements.txt</code>。", "每個專案一個 venv，才不會套件版本打架。") },
      { title: "Python 常用語法速查", content: P("f-string：<code>f\"你好 {name}，共 {n} 筆\"</code>。", "推導式：<code>[x*2 for x in nums if x>0]</code>。", "enumerate 拿索引＋值：<code>for i, x in enumerate(items)</code>。", "字典遍歷：<code>for k, v in d.items()</code>；安全取值 <code>d.get(k, 預設)</code>。") },
      { title: "pandas 資料處理速查", content: P("讀檔：<code>df = pd.read_csv('a.csv')</code>。", "篩選：<code>df[df['age'] > 18]</code>；排序 <code>df.sort_values('age')</code>。", "分組彙總：<code>df.groupby('city')['sales'].sum()</code>。", "缺失值：<code>df.fillna(0)</code> / <code>df.dropna()</code>。") },
      { title: "requests 爬蟲速查", content: P("抓網頁：<code>r = requests.get(url, headers={'User-Agent': '...'})</code>。", "解析：<code>soup = BeautifulSoup(r.text, 'html.parser')</code>；<code>soup.select('css 選擇器')</code>。", "禮貌：看 robots.txt、每次請求間 <code>time.sleep()</code>，別狂打。") },
      { title: "Python 除錯技巧", content: P("看錯誤先看<b>最後一行</b>（Error 類型＋行號）。", "快速印變數：<code>print(f\"{x=}\")</code> 會印出 <code>x=值</code>。", "互動除錯：<code>import pdb; pdb.set_trace()</code>。", "IndentationError 多半是 tab/空白混用。") },
      { title: "好用的 Python 標準庫", content: P("<code>pathlib</code> 處理路徑、<code>json</code> 讀寫 JSON、<code>datetime</code> 日期、<code>collections.Counter</code> 計數、<code>itertools</code> 迭代工具。", "先想「這需求標準庫有沒有現成的」，常常不用自己造輪子。") },
    ],
  },
  {
    title: "🎨 前端開發筆記（官方免費）",
    desc: "HTML / CSS / JS / React 切版與互動速查，切版不再亂試。免費。",
    notes: [
      { title: "HTML 語意標籤速查", content: P("用對標籤：<code>&lt;header&gt; &lt;nav&gt; &lt;main&gt; &lt;section&gt; &lt;article&gt; &lt;footer&gt;</code>。", "表單：<code>&lt;label for=\"id\"&gt;</code> 的 for 要等於 input 的 id，點文字就能選欄位。", "圖片一定要 <code>alt</code>（無障礙＋SEO）。") },
      { title: "CSS Flexbox / Grid 速查", content: P("置中：<code>display:flex; justify-content:center; align-items:center;</code>。", "justify＝主軸、align＝交叉軸。", "格線：<code>display:grid; grid-template-columns: repeat(3, 1fr); gap:12px;</code>。") },
      { title: "RWD 響應式速查", content: P("手機優先，往大螢幕加：<code>@media (min-width:768px){...}</code>。", "圖片自適應：<code>img{max-width:100%; height:auto;}</code>。", "常用斷點 768（平板）/ 1024（桌機）。") },
      { title: "JavaScript 常用速查", content: P("陣列：<code>map / filter / reduce / find</code>。", "非同步：<code>const data = await (await fetch(url)).json();</code>。", "解構：<code>const {name, age} = user;</code>；展開 <code>[...arr]</code>。") },
      { title: "React Hooks 速查", content: P("<code>useState</code> 存狀態、<code>useEffect(fn, [deps])</code> 做副作用（依賴放對、別無限迴圈）。", "清單一定要 <code>key</code>。", "把重複 UI 抽成元件、把重複邏輯抽成自訂 hook。") },
      { title: "串 API / fetch 速查", content: P("GET：<code>fetch(url).then(r=&gt;r.json())</code>。", "POST：<code>fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})</code>。", "記得處理錯誤（<code>if(!res.ok)</code>）與 loading 狀態。") },
    ],
  },
  {
    title: "🗄️ 後端開發筆記（官方免費）",
    desc: "HTTP / SQL / Supabase / 部署，後端入門最實用的一包。免費。",
    notes: [
      { title: "HTTP / REST 速查", content: P("方法：GET 取、POST 建、PUT/PATCH 改、DELETE 刪。", "狀態碼：200 成功、201 已建立、400 參數錯、401 未登入、403 沒權限、404 找不到、500 伺服器爆。", "REST：資源用名詞（/users/123），動作用 HTTP 方法。") },
      { title: "SQL 速查", content: P("查：<code>select * from users where age &gt; 18 order by created_at desc limit 10;</code>。", "join：<code>select u.name, o.amount from users u join orders o on o.user_id = u.id;</code>。", "彙總：<code>select city, count(*) from users group by city;</code>。查詢慢就加 index。") },
      { title: "Supabase 速查", content: P("查：<code>supabase.from('t').select('*').eq('col', val)</code>。", "寫：<code>.insert({...})</code> / <code>.update({...}).eq(...)</code> / <code>.delete().eq(...)</code>。", "權限用 RLS（Row Level Security）控制誰能讀寫哪些列。") },
      { title: "驗證與權限（安全）", content: P("永遠不信前端傳來的東西，後端要再驗一次。", "密鑰放環境變數、<b>絕不</b> commit 進 git。", "SQL 用參數化查詢避免注入；密碼用雜湊不存明碼。") },
      { title: "環境變數與部署", content: P("設定放 <code>.env.local</code>（gitignore）；上線在平台的 runtime env 設。", "public 前綴（如 <code>NEXT_PUBLIC_</code>）才會給前端看到，機密別加前綴。", "部署後先打一筆 API + 看 log 確認有起來。") },
      { title: "後端常見錯誤", content: P("CORS 被擋 → 後端要允許來源。", "500 先看 server log，不是猜。", "非同步忘了 await → 拿到 Promise 不是資料。", "時區：存 UTC、顯示再轉當地。") },
    ],
  },
];

// 冪等：先刪這批（產品 + 該賣家這批 notes）
const titles = PACKS.map((p) => p.title);
await c.query("delete from public.note_products where seller_id=$1 and title = any($2)", [SELLER, titles]);
await c.query("delete from public.notes where user_id=$1 and category=$2", [SELLER, CAT]);

let products = 0, notesCount = 0;
for (const pack of PACKS) {
  const noteIds = [];
  for (const n of pack.notes) {
    const { rows } = await c.query(
      "insert into public.notes (user_id, title, content, category, tags, is_public) values ($1,$2,$3,$4,$5,true) returning id",
      [SELLER, n.title, n.content, CAT, ["官方", "開發筆記"]]
    );
    noteIds.push(rows[0].id); notesCount++;
  }
  await c.query(
    "insert into public.note_products (seller_id, title, description, price_z, note_ids, is_active) values ($1,$2,$3,0,$4::uuid[],true)",
    [SELLER, pack.title, pack.desc, noteIds]
  );
  products++;
}

const { rows: cnt } = await c.query("select count(*)::int n from public.note_products where is_active");
console.log(`✓ 筆記市集種子：${products} 個免費筆記包 / ${notesCount} 則筆記（賣家=AI 島官方、price_z=0）`);
console.log(`  現況 → 上架中商品 ${cnt[0].n}`);
await c.end();
