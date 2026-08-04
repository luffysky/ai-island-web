// Agent 平台 — Tool SDK + registry + MVP 工具集。對齊 docs/agent_platform_plan.md §6/§8。
// 風險等級：read=自動、write=執行前確認、dangerous=強制逐次確認。
// MVP：web.fetch / dictionary.lookup 走伺服器真的能跑；device.* 是 stub（Phase 1b 接 Electron Bridge 才真的動使用者的機器）。
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { runCode } from "@/lib/code-runner";
import { validateInternalPath, validateExternalUrl } from "@/lib/agent/client-actions";

export type RiskLevel = "read" | "write" | "dangerous";
export type Platform = "web" | "windows" | "macos" | "android" | "ios" | "server";

export interface ToolResult { ok: boolean; data?: unknown; error?: string; }
export interface ToolContext { userId: string; taskId: string; }

export interface AgentTool {
  name: string;
  description: string;              // 給 LLM 讀
  args: Record<string, string>;     // 參數名→說明（給 LLM 看，簡化版 schema）
  risk: RiskLevel;
  platforms: Platform[];
  needsDevice?: boolean;            // 需本機桌面助手（Phase 1b）
  execute(args: any, ctx: ToolContext): Promise<ToolResult>;
}

// 簡易 HTML → 純文字（去標籤、壓空白），給 web.fetch 回摘要用
function htmlToText(html: string): { title: string; text: string } {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { title, text: body.slice(0, 1500) };
}

// 安全數學運算式解析（遞迴下降、零 eval、零 RCE）：只支援數字/+-*/%、括號、常數 pi/e、白名單函式。
function safeMath(input: string): number {
  const s = input.replace(/\s+/g, "");
  if (!/^[0-9.+\-*/%(),a-zA-Z]*$/.test(s)) throw new Error("含非法字元");
  const FUNCS: Record<string, (...a: number[]) => number> = {
    sqrt: Math.sqrt, abs: Math.abs, round: Math.round, floor: Math.floor, ceil: Math.ceil,
    min: Math.min, max: Math.max, pow: Math.pow, log: Math.log, exp: Math.exp,
  };
  const CONST: Record<string, number> = { pi: Math.PI, e: Math.E };
  let i = 0;
  const peek = () => s[i];
  function expr(): number { let v = term(); while (peek() === "+" || peek() === "-") { const op = s[i++]; const t = term(); v = op === "+" ? v + t : v - t; } return v; }
  function term(): number { let v = unary(); while (peek() === "*" || peek() === "/" || peek() === "%") { const op = s[i++]; const u = unary(); v = op === "*" ? v * u : op === "/" ? v / u : v % u; } return v; }
  function unary(): number { if (peek() === "+") { i++; return unary(); } if (peek() === "-") { i++; return -unary(); } return primary(); }
  function primary(): number {
    if (peek() === "(") { i++; const v = expr(); if (s[i] !== ")") throw new Error("缺 )"); i++; return v; }
    const num = s.slice(i).match(/^\d+(\.\d+)?([eE][-+]?\d+)?/);
    if (num) { i += num[0].length; return parseFloat(num[0]); }
    const id = s.slice(i).match(/^[a-zA-Z]+/);
    if (id) {
      const name = id[0].toLowerCase(); i += id[0].length;
      if (peek() === "(") { i++; const args = [expr()]; while (peek() === ",") { i++; args.push(expr()); } if (s[i] !== ")") throw new Error("缺 )"); i++; const fn = FUNCS[name]; if (!fn) throw new Error("未知函式 " + name); return fn(...args); }
      if (name in CONST) return CONST[name];
      throw new Error("未知符號 " + name);
    }
    throw new Error("解析失敗");
  }
  const r = expr();
  if (i < s.length) throw new Error("多餘字元");
  if (!isFinite(r)) throw new Error("結果非有限數");
  return r;
}

// DuckDuckGo html 結果連結是 //duckduckgo.com/l/?uddg=<encoded> 轉址 → 還原真實網址
function decodeDdgUrl(href: string): string {
  try {
    const m = href.match(/[?&]uddg=([^&]+)/);
    if (m) return decodeURIComponent(m[1]);
    return href.startsWith("//") ? "https:" + href : href;
  } catch { return href; }
}
function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}

const SEARCH_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
type SearchHit = { title: string; url: string; snippet: string };

// Brave Search API（穩定、專門給程式用）。優先用「使用者自己的 key」(BYOK)、否則用系統 BRAVE_API_KEY。都沒有 → 回 []（退回 DDG）。
async function braveSearch(query: string, count: number, userId?: string): Promise<SearchHit[]> {
  let key = "";
  if (userId) {
    try {
      const admin = createSupabaseAdmin();
      const { data } = await admin.from("user_api_keys")
        .select("api_key_encrypted").eq("user_id", userId).eq("provider", "brave").eq("is_active", true).limit(1).maybeSingle();
      if (data?.api_key_encrypted) { const { decryptKey } = await import("@/lib/ai-crypto"); key = decryptKey(data.api_key_encrypted); }
    } catch { /* 用系統 key */ }
  }
  if (!key) key = process.env.BRAVE_API_KEY ?? "";
  if (!key) return [];
  try {
    const r = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${Math.min(Math.max(count, 1), 20)}&country=tw&search_lang=zh-hant`, {
      headers: { Accept: "application/json", "X-Subscription-Token": key }, signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) return [];
    const j = await r.json();
    return ((j?.web?.results ?? []) as any[])
      .map((x) => ({ title: stripTags(String(x.title ?? "")), url: String(x.url ?? ""), snippet: stripTags(String(x.description ?? "")).slice(0, 220) }))
      .filter((x) => /^https?:/.test(x.url));
  } catch { return []; }
}

// DuckDuckGo（免 key、備援；會被 rate limit）。
async function ddgSearch(query: string, limit: number): Promise<SearchHit[]> {
  try {
    const r = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, { headers: { "User-Agent": SEARCH_UA, "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8" }, signal: AbortSignal.timeout(12000) });
    const html = await r.text();
    const out: SearchHit[] = [];
    const re = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>([\s\S]*?)(?=<a[^>]*class="result__a"|$)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null && out.length < limit) {
      const url = decodeDdgUrl(m[1]);
      const title = stripTags(m[2]);
      const snip = m[3].match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
      if (title && /^https?:/.test(url) && !/duckduckgo\.com\/y\.js|ad_domain=/.test(url)) out.push({ title, url, snippet: snip ? stripTags(snip[1]).slice(0, 220) : "" });
    }
    return out;
  } catch { return []; }
}

// Tavily Search API（專為 AI agent 設計、每月 1000 次免費、全網、回乾淨內容）。可 BYOK。
// 需要 TAVILY_API_KEY（或使用者 user_api_keys provider=tavily）。沒 key → 回 []（跳過）。
async function tavilySearch(query: string, count: number, userId?: string): Promise<SearchHit[]> {
  let key = "";
  if (userId) {
    try {
      const admin = createSupabaseAdmin();
      const { data } = await admin.from("user_api_keys")
        .select("api_key_encrypted").eq("user_id", userId).eq("provider", "tavily").eq("is_active", true).limit(1).maybeSingle();
      if (data?.api_key_encrypted) { const { decryptKey } = await import("@/lib/ai-crypto"); key = decryptKey(data.api_key_encrypted); }
    } catch { /* 用系統 key */ }
  }
  if (!key) key = process.env.TAVILY_API_KEY ?? "";
  if (!key) return [];
  try {
    const r = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ query, max_results: Math.min(Math.max(count, 1), 10), search_depth: "basic" }),
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return [];
    const j = await r.json();
    return ((j?.results ?? []) as any[])
      .map((x) => ({ title: stripTags(String(x.title ?? "")), url: String(x.url ?? ""), snippet: stripTags(String(x.content ?? "")).slice(0, 220) }))
      .filter((x) => /^https?:/.test(x.url));
  } catch { return []; }
}

// 統一搜尋（免費優先，逐級升級，省額度）：
//   1) DDG 免費爬蟲（無上限、但偶爾被擋、中英都行）→ 夠 4 筆就用
//   2) Tavily（AI 專用、1000 次/月免費）——**實測對中文幾乎 0 結果**，故只在「非中文查詢」才用，
//      免得中文查詢空跑白白吃掉 credit + 拖時間。
//   3) Brave（穩、可 BYOK、zh-hant 中文好、2000 次/月）
// 有額度的來源只在「前一級失敗」時才動用 → 額度撐更久。
async function searchLinks(query: string, limit: number, userId?: string): Promise<SearchHit[]> {
  const ddg = await ddgSearch(query, limit);
  if (ddg.length >= 4) return ddg;
  const hasCJK = /[㐀-鿿぀-ヿ가-힯]/.test(query);  // 中日韓字 → 跳過 Tavily
  if (!hasCJK) {
    const tavily = await tavilySearch(query, limit, userId);
    if (tavily.length) return tavily;
  }
  const brave = await braveSearch(query, limit, userId);
  if (brave.length) return brave;
  return ddg;  // 全部沒有 → 至少回 DDG 撈到的那一兩筆
}

// 站內功能頁（search_course 的 feature 類）。title 命中或關鍵字互含即算符合。
const SITE_FEATURES: { title: string; path: string; kw: string[] }[] = [
  { title: "每日運勢 / AI 命理", path: "/fortune", kw: ["運勢", "命理", "星座", "塔羅", "八字", "算命", "梅花", "占卜"] },
  { title: "訊息軍師", path: "/message-coach", kw: ["訊息", "軍師", "講話", "怎麼說", "道歉", "加薪", "婉拒", "開口"] },
  { title: "分身島 AI 代理", path: "/agent", kw: ["分身", "代理", "agent", "員工", "自動化", "助理"] },
  { title: "程式辭典", path: "/dictionary", kw: ["辭典", "術語", "名詞", "字典", "定義"] },
  { title: "課程章節", path: "/chapters", kw: ["課程", "章節", "教材", "學程式", "上課"] },
  { title: "機會島", path: "/opportunities", kw: ["機會", "競賽", "比賽", "徵件", "獎金"] },
  { title: "排行榜", path: "/leaderboard", kw: ["排行", "排名", "榜"] },
  { title: "我的學習紀錄", path: "/me", kw: ["學習紀錄", "我的", "進度", "個人"] },
  { title: "訂閱方案", path: "/pricing", kw: ["訂閱", "付費", "方案", "價格", "升級"] },
];

/** 依關鍵字比對站內功能頁（純函式、可測）。 */
export function matchSiteFeatures(query: string): { title: string; path: string }[] {
  const q = String(query ?? "").trim();
  if (!q) return [];
  const ql = q.toLowerCase();
  return SITE_FEATURES
    .filter((f) => f.title.includes(q) || f.kw.some((k) => ql.includes(k.toLowerCase()) || k.toLowerCase().includes(ql)))
    .map((f) => ({ title: f.title, path: f.path }));
}

// 派發一個 client-action 信封進 agent_tasks.client_actions（原子 RPC append）。
// 只標 status:"pending"——完成/失敗由前端執行後回報（不因派發就算 completed）。
async function dispatchClientAction(ctx: ToolContext, action: Record<string, unknown>): Promise<ToolResult> {
  if (!ctx?.taskId || !ctx?.userId) return { ok: false, error: "缺任務內容，無法派發瀏覽器動作" };
  const id = globalThis.crypto?.randomUUID?.() ?? `ca_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const full = { id, status: "pending", createdAt: new Date().toISOString(), ...action };
  try {
    const admin = createSupabaseAdmin();
    const { error } = await admin.rpc("agent_client_action_append", { p_task_id: ctx.taskId, p_user_id: ctx.userId, p_action: full });
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { dispatched: true, actionId: id, status: "pending", note: "已交給你的瀏覽器執行，完成後我會知道結果。" } };
  } catch (e: any) { return { ok: false, error: e?.message ?? "派發失敗" }; }
}

export const TOOLS: AgentTool[] = [
  {
    name: "web.search",
    description: "用關鍵字搜尋網路、回傳前幾筆結果（標題＋摘要＋連結，唯讀）。**找資料/店家/新聞先用這個**，比直接猜網址或抓 Google 可靠（Google 會擋機器人）。拿到連結再用 web.fetch 讀內文。",
    args: { query: "搜尋關鍵字（如：台北車站 美食 推薦）" },
    risk: "read",
    platforms: ["server"],
    async execute(args, ctx) {
      const q = String(args?.query ?? "").trim().slice(0, 200);
      if (!q) return { ok: false, error: "缺 query" };
      const results = await searchLinks(q, 6, ctx?.userId);
      if (!results.length) return { ok: true, data: { results: [], note: "沒搜到結果（或來源暫時擋住），換個關鍵字再試" } };
      return { ok: true, data: { results } };
    },
  },
  {
    name: "web.research",
    description: "**深入研究一個主題**：一次搜尋 + 平行抓取多個來源的內文、自動去重、彙整回傳（唯讀）。需要多來源、要詳細/交叉比對時用這個——比一個個 web.fetch 快很多、也更完整。拿到後直接整理成含具體資訊（地址/時間/價格/數字）＋來源連結的答案。",
    args: { query: "研究主題／關鍵字", max: "最多抓幾個來源（預設 5、上限 8，可省略）" },
    risk: "read",
    platforms: ["server"],
    async execute(args, ctx) {
      const q = String(args?.query ?? "").trim().slice(0, 200);
      if (!q) return { ok: false, error: "缺 query" };
      const max = Math.min(Math.max(Number(args?.max) || 5, 1), 8);
      try {
        const hits = await searchLinks(q, max * 2, ctx?.userId);
        const seen = new Set<string>();
        const pick = hits.map((h) => h.url).filter((u) => !seen.has(u) && seen.add(u)).slice(0, max);
        if (!pick.length) return { ok: true, data: { sources: [], note: "沒搜到來源（或來源暫時擋住），換個關鍵字再試" } };
        // 平行抓取多個來源（互不阻塞）
        const sources = await Promise.all(pick.map(async (url) => {
          try {
            const r = await fetch(url, { headers: { "User-Agent": SEARCH_UA, "Accept-Language": "zh-TW,zh;q=0.9" }, signal: AbortSignal.timeout(10000) });
            const { title, text } = htmlToText(await r.text());
            return { url, title, text: text.slice(0, 1400) };
          } catch { return { url, title: "", text: "", error: "抓取失敗" }; }
        }));
        const good = sources.filter((s) => s.text || s.title);
        return { ok: true, data: { query: q, count: good.length, sources: good } };
      } catch (e: any) { return { ok: false, error: e?.message ?? "研究失敗" }; }
    },
  },
  {
    name: "web.fetch",
    description: "抓一個網址、回傳它的標題與主要文字內容（唯讀、安全）。讀特定一頁用；要多來源研究請用 web.research。",
    args: { url: "要抓的完整網址（https://...）" },
    risk: "read",
    platforms: ["server"],
    async execute(args) {
      const url = String(args?.url ?? "");
      if (!/^https?:\/\//.test(url)) return { ok: false, error: "url 必須是 http(s):// 開頭" };
      try {
        const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 AI-Island-Agent" }, signal: AbortSignal.timeout(12000) });
        const html = await r.text();
        const { title, text } = htmlToText(html);
        return { ok: true, data: { status: r.status, title, text } };
      } catch (e: any) { return { ok: false, error: e?.message ?? "fetch 失敗" }; }
    },
  },
  {
    name: "browser.render",
    description: "用真正的瀏覽器打開網址（會跑 JS、能讀動態頁 / 擋 bot 的站），回傳標題與主要文字（唯讀）。**web.fetch 讀不到（403 / 需 JS / 空白）的頁面才用這個**——它較慢、能不用就用 web.research/web.fetch。",
    args: { url: "完整網址（https://...）" },
    risk: "read",
    platforms: ["server"],
    async execute(args) {
      const url = String(args?.url ?? "");
      if (!/^https?:\/\//.test(url)) return { ok: false, error: "url 必須是 http(s):// 開頭" };
      // 伺服器瀏覽器預設關（正式站要在 Dockerfile build arg 裝 Chromium + 設 ENABLE_SERVER_BROWSER=1 才開）。
      // 沒開就明講、改走 web.research/web.fetch，別讓 agent 卡在這。
      if (!process.env.ENABLE_SERVER_BROWSER) {
        return { ok: false, error: "伺服器瀏覽器未啟用（本站未裝 Chromium）。請改用 web.research / web.fetch，或用桌面助手的 browser.* 在你電腦上開。" };
      }
      let browser: any = null;
      try {
        const { chromium } = await import("playwright");
        browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"] });
        const ctx = await browser.newContext({ userAgent: SEARCH_UA, locale: "zh-TW", viewport: { width: 1280, height: 900 } });
        const page = await ctx.newPage();
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
        await page.waitForTimeout(1200);
        const title = await page.title();
        const text = String(await page.evaluate(() => (document.body as any)?.innerText || "")).replace(/\s+/g, " ").trim().slice(0, 2800);
        return { ok: true, data: { title, text } };
      } catch (e: any) {
        return { ok: false, error: "伺服器瀏覽器尚未就緒或載入失敗（可改用 web.research / web.fetch）：" + String(e?.message ?? "").slice(0, 120) };
      } finally { try { await browser?.close(); } catch { /* ignore */ } }
    },
  },
  {
    name: "code.run",
    description: "在隔離沙盒執行一段程式碼、回傳輸出（stdout / stderr / exit code）。支援 Python / JavaScript / TypeScript / Go / Rust / Java / C / C++ / C# / Ruby / PHP / Bash / SQL(SQLite) / Kotlin / Swift / Lua / Dart / R / Scala。**用來驗證你寫的程式、跑計算、測試邏輯、處理/轉換資料**——比用猜的可靠。沙盒是外部隔離環境、有時間與輸出上限、無法存取本站資料或做網路副作用；要算數用 math.eval 更省。",
    args: {
      language: "程式語言（python / javascript / typescript / go / rust / java / cpp / c / csharp / ruby / php / bash / sql …）",
      code: "要執行的完整程式碼",
      stdin: "（選填）標準輸入內容",
    },
    risk: "dangerous",
    platforms: ["server"],
    async execute(args) {
      const language = String(args?.language ?? "").trim();
      const code = String(args?.code ?? "");
      if (!language || !code) return { ok: false, error: "需要 language 和 code" };
      const r = await runCode({ language, code, stdin: args?.stdin ? String(args.stdin) : "" });
      if (!r.ok) return { ok: false, error: r.error };
      return {
        ok: true,
        data: {
          via: r.via,
          exitCode: r.exitCode,
          stdout: String(r.stdout ?? "").slice(0, 4000),
          stderr: String(r.stderr ?? "").slice(0, 2000),
          compileError: r.compile?.stderr ? String(r.compile.stderr).slice(0, 1000) : undefined,
        },
      };
    },
  },
  {
    name: "dictionary.lookup",
    description: "查 AI 島程式辭典裡某個術語的白話解釋（唯讀）。用來解釋程式術語/黑話。",
    args: { term: "要查的術語或關鍵字（如 async、技術債、404）" },
    risk: "read",
    platforms: ["server"],
    async execute(args) {
      const term = String(args?.term ?? "").replace(/[%,()*]/g, " ").trim().slice(0, 60);
      if (!term) return { ok: false, error: "缺 term" };
      const admin = createSupabaseAdmin();
      const { data } = await admin.from("dictionary_terms")
        .select("term, zh_name, plain, analogy, example")
        .or(`term.ilike.%${term}%,zh_name.ilike.%${term}%`).limit(3);
      if (!data || !data.length) return { ok: true, data: { found: false, note: "辭典裡沒有這個詞" } };
      return { ok: true, data: { found: true, results: data } };
    },
  },
  // 2.6.5 Agent 互相共享資料：私人結構化黑板（user 範圍）。多個 agent/任務可用它直接交換 jsonb，
  // 資料不經 LLM 重述（省 token、不失真）。純內部、無外部副作用 → read 風險、自動執行。
  {
    name: "data.write",
    description: "把一份結構化資料以 key 存進你的私人共享黑板，供其他分身/任務直接讀取（不經 LLM 轉述、不失真）。value 可為物件或字串。",
    args: { key: "資料鍵（如 competitor_prices、research_notes）", value: "要存的資料（JSON 物件或字串）" },
    risk: "read",
    platforms: ["server"],
    async execute(args, ctx) {
      const key = String(args?.key ?? "").trim().slice(0, 100);
      if (!key) return { ok: false, error: "缺 key" };
      if (args?.value === undefined || args?.value === null) return { ok: false, error: "缺 value" };
      let value: any = args.value;
      if (typeof value === "string") { try { value = JSON.parse(value); } catch { /* 純字串就原樣存 */ value = { text: value.slice(0, 20000) }; } }
      const admin = createSupabaseAdmin();
      const { error } = await admin.from("agent_shared_data")
        .upsert({ user_id: ctx.userId, key, value, updated_by_task: ctx.taskId, updated_at: new Date().toISOString() }, { onConflict: "user_id,key" });
      if (error) return { ok: false, error: error.message };
      return { ok: true, data: { saved: true, key } };
    },
  },
  {
    name: "data.read",
    description: "讀取共享黑板上某個 key 的結構化資料（可能是別的分身/任務先存好的），拿到的是原始 jsonb、不是摘要。",
    args: { key: "要讀的資料鍵" },
    risk: "read",
    platforms: ["server"],
    async execute(args, ctx) {
      const key = String(args?.key ?? "").trim().slice(0, 100);
      if (!key) return { ok: false, error: "缺 key" };
      const admin = createSupabaseAdmin();
      const { data } = await admin.from("agent_shared_data")
        .select("value, updated_at").eq("user_id", ctx.userId).eq("key", key).maybeSingle();
      if (!data) return { ok: true, data: { found: false, note: "黑板上沒有這個 key" } };
      return { ok: true, data: { found: true, key, value: data.value, updated_at: data.updated_at } };
    },
  },
  {
    name: "data.list",
    description: "列出共享黑板上目前有哪些 key（看看其他分身/任務留下了什麼可用資料）。",
    args: {},
    risk: "read",
    platforms: ["server"],
    async execute(_args, ctx) {
      const admin = createSupabaseAdmin();
      const { data } = await admin.from("agent_shared_data")
        .select("key, updated_at").eq("user_id", ctx.userId).order("updated_at", { ascending: false }).limit(50);
      return { ok: true, data: { keys: (data ?? []).map((d: any) => ({ key: d.key, updated_at: d.updated_at })) } };
    },
  },
  // ── 省 token「Tool First」工具（Snow Orchestrator）：算數/日期/JSON 用程式、不燒大模型。安全、零 eval ──
  {
    name: "datetime.now",
    description: "取得現在的日期時間與星期幾（台灣時區），可加減天數。算截止倒數、排程用。**別叫大模型算日期、這個又快又免費。**",
    args: { offsetDays: "要往後(正)/往前(負)幾天，可省略（例：7 = 一週後）" },
    risk: "read",
    platforms: ["server"],
    async execute(args) {
      const off = Number(args?.offsetDays) || 0;
      const d = new Date(Date.now() + off * 86400000);
      const parts = Object.fromEntries(
        new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "long", hour12: false })
          .formatToParts(d).map((p) => [p.type, p.value]),
      );
      return { ok: true, data: { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}`, weekday: parts.weekday, iso: d.toISOString() } };
    },
  },
  {
    name: "math.eval",
    description: "安全計算一個數學運算式（+ - * / % 括號、pi/e、sqrt/abs/round/min/max/pow/log 等）。**算數別叫大模型、這個精準又免費。**",
    args: { expr: "運算式，如 (1234*0.3)+56 或 sqrt(2)*100" },
    risk: "read",
    platforms: ["server"],
    async execute(args) {
      try { return { ok: true, data: { result: safeMath(String(args?.expr ?? "")) } }; }
      catch (e: any) { return { ok: false, error: e?.message ?? "無法計算" }; }
    },
  },
  {
    name: "json.query",
    description: "解析 JSON 字串、可用點路徑取值（如 data.items.0.name）。整理/取欄位別叫大模型。",
    args: { json: "JSON 字串或物件", path: "點路徑（可省略＝回整包）" },
    risk: "read",
    platforms: ["server"],
    async execute(args) {
      try {
        const obj = typeof args?.json === "string" ? JSON.parse(args.json) : args?.json;
        const path = String(args?.path ?? "").trim();
        if (!path) return { ok: true, data: { value: obj } };
        let cur: any = obj;
        for (const key of path.split(".")) { if (cur == null) break; cur = cur[key]; }
        return { ok: true, data: { value: cur ?? null } };
      } catch (e: any) { return { ok: false, error: e?.message ?? "JSON 解析失敗" }; }
    },
  },
  {
    name: "ai.ask",
    description: "把一個子問題交給 AI 島的 AI 直接回答/生成（摘要、翻譯、寫段落、分類、判斷）。當你需要語言生成而非查資料時用；查資料請先用 web.search。",
    args: { prompt: "要問或要生成的內容（含必要脈絡）" },
    risk: "read",
    platforms: ["server"],
    async execute(args) {
      const prompt = String(args?.prompt ?? "").slice(0, 4000);
      if (!prompt) return { ok: false, error: "缺 prompt" };
      try {
        const { completeForUsage } = await import("@/lib/resolve-usage-ai");
        const res = await completeForUsage("agent_core", { user: prompt, maxTokens: 800, defaultModel: "claude-haiku-4-5-20251001" });
        return { ok: true, data: { answer: (res.text ?? "").trim() } };
      } catch (e: any) { return { ok: false, error: e?.message ?? "AI 生成失敗" }; }
    },
  },
  // ── Phase F：第一方（AI 島生態）工具 — 分身懂「你」，通用 claw agent 拿不到。皆雲端唯讀、手機也能跑 ──
  {
    name: "island.myProfile",
    description: "讀取『目前這位使用者』在 AI 島的檔案：等級、經驗、連續學習天數、Z幣、暱稱（唯讀）。用來依使用者程度/狀況客製回覆。",
    args: {},
    risk: "read",
    platforms: ["server"],
    async execute(_args, ctx) {
      const admin = createSupabaseAdmin();
      const { data } = await admin.from("profiles")
        .select("display_name, username, level, xp, streak_days, z_coin")
        .eq("id", ctx.userId).maybeSingle();
      if (!data) return { ok: true, data: { note: "找不到使用者檔案" } };
      return { ok: true, data };
    },
  },
  {
    name: "island.searchLessons",
    description: "在 AI 島課程（章節/小節）裡用關鍵字找相關教學小節（唯讀）。用來把使用者導到站內對的教材。",
    args: { keyword: "關鍵字（如 HTML、遞迴、Supabase）" },
    risk: "read",
    platforms: ["server"],
    async execute(args) {
      const q = String(args?.keyword ?? "").replace(/[%,()*]/g, " ").trim().slice(0, 60);
      if (!q) return { ok: false, error: "缺 keyword" };
      const admin = createSupabaseAdmin();
      const { data } = await admin.from("lessons")
        .select("title, chapter_id").ilike("title", `%${q}%`).limit(8);
      if (!data || !data.length) return { ok: true, data: { found: false, note: "課程裡沒找到相關小節" } };
      return { ok: true, data: { found: true, results: data } };
    },
  },
  {
    name: "opportunity.search",
    description: "在 AI 島『機會島』搜尋開放中的競賽/補助/創投等機會（唯讀）。用來幫使用者找適合投的比賽、查截止日與獎金。",
    args: { keyword: "關鍵字（如 AI、創業、設計）", freeOnly: "只看免報名費（true/false，可省略）" },
    risk: "read",
    platforms: ["server"],
    async execute(args) {
      const kw = String(args?.keyword ?? "").replace(/[%,()*]/g, " ").trim().slice(0, 60);
      const admin = createSupabaseAdmin();
      let q = admin.from("opportunities")
        .select("name, category, prize_text, application_deadline, status, official_url")
        .eq("status", "open").limit(8);
      if (kw) q = q.or(`name.ilike.%${kw}%,category.ilike.%${kw}%,organizer.ilike.%${kw}%`);
      if (String(args?.freeOnly) === "true") q = q.eq("is_free", true);
      const { data } = await q;
      if (!data || !data.length) return { ok: true, data: { found: false, note: "機會島目前沒有符合的開放機會" } };
      return { ok: true, data: { found: true, results: data } };
    },
  },
  // ── client-action 工具（platforms:["web"]）：execute() 只在伺服器「派發」信封進 agent_tasks.client_actions，
  //     真正的導航/開頁由前端輪詢後在使用者分頁執行、再回報結果（見 client-actions.ts / ack route）──
  {
    name: "navigate_internal",
    description: "帶使用者在 AI 島站內切換到指定頁面（用他目前分頁的前端路由、不重整）。只吃站內路徑（/ 開頭，如 /chapters/26、/dictionary、/fortune、/agent）。章節路徑是數字 id（/chapters/<數字>）；不確定路徑時先用 search_course 查到正確 path。要開外部網站請用 open_url。",
    args: { path: "站內路徑，必須 / 開頭（如 /chapters/26 或 /fortune）" },
    risk: "read",
    platforms: ["web"],
    async execute(args, ctx) {
      const v = validateInternalPath(args?.path);
      if (!v.ok) return { ok: false, error: v.reason ?? "站內路徑不合法" };
      return dispatchClientAction(ctx, { type: "navigate_internal", path: v.path });
    },
  },
  {
    name: "open_url",
    description: "在使用者的瀏覽器打開一個外部網址（如 YouTube、某篇文章）。只允許 https。預設另開分頁（會請使用者點一下再開、避免被瀏覽器擋）。站內換頁請改用 navigate_internal。",
    args: { url: "完整外部網址（https://…）", target: "same-tab 或 new-tab（預設 new-tab）" },
    risk: "write",   // 對外開頁 → 走既有 approval，讓使用者先看到網址再放行
    platforms: ["web"],
    async execute(args, ctx) {
      const allowLocalhost = process.env.NODE_ENV !== "production";
      const v = validateExternalUrl(args?.url, { allowLocalhost });
      if (!v.ok) return { ok: false, error: v.reason ?? "網址不合法" };
      const target = args?.target === "same-tab" ? "same-tab" : "new-tab";
      return dispatchClientAction(ctx, { type: "open_url", url: v.url, target });
    },
  },
  {
    name: "search_course",
    description: "搜尋 AI 島站內：教材章節、程式辭典詞條、功能頁面，回傳標題＋站內路徑（唯讀）。找到後可用 navigate_internal 帶使用者過去。type 可選 all/course/dictionary/feature（預設 all）。",
    args: { query: "搜尋關鍵字（如 迴圈、async、運勢）", type: "all｜course｜dictionary｜feature（預設 all，可省略）" },
    risk: "read",
    platforms: ["server"],
    async execute(args) {
      const q = String(args?.query ?? "").trim().slice(0, 60);
      if (!q) return { ok: false, error: "缺 query" };
      const type = ["course", "dictionary", "feature"].includes(String(args?.type)) ? String(args?.type) : "all";
      const admin = createSupabaseAdmin();
      const like = `%${q.replace(/[%_]/g, "")}%`;
      const results: { kind: string; title: string; path: string; note?: string }[] = [];
      if (type === "all" || type === "course") {
        try {
          const { data } = await admin.from("chapters").select("id,title,description")
            .or(`title.ilike.${like},description.ilike.${like}`).order("sort_index").limit(6);
          for (const c of (data ?? []) as any[]) results.push({ kind: "course", title: c.title, path: `/chapters/${c.id}`, note: c.description ? String(c.description).slice(0, 80) : undefined });
        } catch { /* ignore */ }
      }
      if (type === "all" || type === "dictionary") {
        try {
          const { data } = await admin.from("dictionary_terms").select("slug,term,zh_name")
            .or(`term.ilike.${like},zh_name.ilike.${like},slug.ilike.${like}`).limit(6);
          for (const t of (data ?? []) as any[]) results.push({ kind: "dictionary", title: `${t.term}${t.zh_name ? "（" + t.zh_name + "）" : ""}`, path: `/dictionary/${t.slug}` });
        } catch { /* ignore */ }
      }
      if (type === "all" || type === "feature") {
        for (const f of matchSiteFeatures(q)) results.push({ kind: "feature", title: f.title, path: f.path });
      }
      return { ok: true, data: { query: q, count: results.length, results: results.slice(0, 15) } };
    },
  },
  {
    name: "agent_status",
    description: "查目前這位使用者有哪些分身任務、狀態如何（規劃中/執行中/等你確認/完成/失敗）。回答「現在有哪些代理在工作」「剛才那個任務好了嗎」用這個（唯讀）。",
    args: {},
    risk: "read",
    platforms: ["server"],
    async execute(_args, ctx) {
      if (!ctx?.userId) return { ok: false, error: "缺使用者" };
      const admin = createSupabaseAdmin();
      const { data } = await admin.from("agent_tasks").select("goal,status,step_count,created_at")
        .eq("user_id", ctx.userId).order("created_at", { ascending: false }).limit(8);
      const LIVE = ["planning", "running", "awaiting_approval", "awaiting_device"];
      const recent = ((data ?? []) as any[]).map((t) => ({ goal: String(t.goal ?? "").slice(0, 60), status: t.status, working: LIVE.includes(t.status), steps: t.step_count }));
      return { ok: true, data: { active: recent.filter((t) => t.working).length, recent } };
    },
  },
  // ── 以下 device.* 為 Phase 1b stub：需本機桌面助手；現在會觸發權限流程、但回「尚未連接」 ──
  {
    name: "filesystem.list",
    description: "列出使用者本機某資料夾的檔案（需桌面助手）。",
    args: { path: "資料夾路徑" },
    risk: "read",
    platforms: ["windows"],
    needsDevice: true,
    async execute() { return { ok: false, error: "需安裝並連接『AI 島桌面助手』（Phase 1b 尚未接）" }; },
  },
  {
    name: "filesystem.read",
    description: "讀取使用者本機某個文字檔的內容（需桌面助手、限白名單資料夾）。",
    args: { path: "檔案路徑" },
    risk: "read",
    platforms: ["windows"],
    needsDevice: true,
    async execute() { return { ok: false, error: "需安裝並連接『AI 島桌面助手』（Phase 1b 尚未接）" }; },
  },
  {
    name: "filesystem.write",
    description: "在使用者本機建立/修改文字檔（需桌面助手、寫入前需確認）。",
    args: { path: "檔案路徑", content: "內容" },
    risk: "write",
    platforms: ["windows"],
    needsDevice: true,
    async execute() { return { ok: false, error: "需安裝並連接『AI 島桌面助手』（Phase 1b 尚未接）" }; },
  },
  {
    name: "system.run_command",
    description: "在使用者本機執行白名單終端指令（如 npm test）（需桌面助手、高風險、強制確認）。",
    args: { command: "指令" },
    risk: "dangerous",
    platforms: ["windows"],
    needsDevice: true,
    async execute() { return { ok: false, error: "需安裝並連接『AI 島桌面助手』（Phase 1b 尚未接）" }; },
  },
  // ── 瀏覽器工具（需桌面助手 + Playwright；獨立 Chromium 走 DOM/文字，不靠座標）──
  {
    name: "browser.open",
    description: "用瀏覽器打開一個網址，回傳標題與頁面文字（需桌面助手）。用來讀動態網頁/需登入或 JS 的頁面。",
    args: { url: "完整網址（https://...）" },
    risk: "read",
    platforms: ["windows"],
    needsDevice: true,
    async execute() { return { ok: false, error: "需安裝並連接『AI 島桌面助手』並安裝 Playwright" }; },
  },
  {
    name: "browser.click",
    description: "點擊目前頁面上含指定文字的連結/按鈕，回傳點擊後的頁面（需桌面助手、會操作頁面、需確認）。",
    args: { text: "要點的元素文字" },
    risk: "write",
    platforms: ["windows"],
    needsDevice: true,
    async execute() { return { ok: false, error: "需安裝並連接『AI 島桌面助手』並安裝 Playwright" }; },
  },
  {
    name: "browser.type",
    description: "在指定欄位輸入文字（需桌面助手、會操作頁面、需確認）。",
    args: { selector: "CSS selector 或欄位 placeholder/label", text: "要輸入的文字" },
    risk: "write",
    platforms: ["windows"],
    needsDevice: true,
    async execute() { return { ok: false, error: "需安裝並連接『AI 島桌面助手』並安裝 Playwright" }; },
  },
  {
    name: "browser.screenshot",
    description: "把目前瀏覽器頁面截圖回傳（需桌面助手）。讓 Agent/你看見畫面。",
    args: {},
    risk: "read",
    platforms: ["windows"],
    needsDevice: true,
    async execute() { return { ok: false, error: "需安裝並連接『AI 島桌面助手』並安裝 Playwright" }; },
  },
];

export function getTool(name: string): AgentTool | undefined {
  return TOOLS.find((t) => t.name === name);
}

/** 描述任一組工具（給 LLM 讀）。 */
export function describeToolList(list: AgentTool[]): string {
  return list.map((t) =>
    `- ${t.name}（${t.risk}${t.needsDevice ? "、需桌面助手" : ""}）：${t.description} 參數：${JSON.stringify(t.args)}`
  ).join("\n");
}

/** 依技能 allowed 過濾（含動態 extra 工具，如 MCP）。
 *  allowed 語意：undefined = 全部；[] = 不給工具；非空 = 只給該子集。 */
export function effectiveTools(allowed?: string[], extra: AgentTool[] = []): AgentTool[] {
  const all = [...TOOLS, ...extra];
  return allowed === undefined ? all : all.filter((t) => allowed.includes(t.name));
}

/** 給 LLM 的工具清單描述（靜態註冊表；相容舊呼叫）。 */
export function describeTools(allowed?: string[]): string {
  return describeToolList(effectiveTools(allowed));
}

/** 工具是否允許：undefined = 全部；否則須在白名單內（[] = 全不允許）。 */
export function toolAllowed(name: string, allowed?: string[]): boolean {
  return allowed === undefined || allowed.includes(name);
}

/** 風險 → 是否需要人工確認（L0 read 自動；write/dangerous 要確認）。 */
export function needsApproval(risk: RiskLevel): boolean {
  return risk === "write" || risk === "dangerous";
}

/** 產生確認摘要（動作/影響/可復原）給前端彈窗。 */
// 常見「內容欄位」：發文/寄信/留言等 outbound 工具，真正要人看的是這份草稿全文（2.6.2）
const CONTENT_ARG_KEYS = ["text", "content", "body", "message", "caption", "html", "draft", "post", "comment", "reply"];

export function approvalSummary(tool: AgentTool, args: any): Record<string, string> {
  const base: Record<string, string> = {
    動作: `${tool.name} ${JSON.stringify(args ?? {}).slice(0, 200)}`,
    位置: String(args?.path ?? args?.url ?? args?.command ?? "—"),
    影響: tool.risk === "dangerous" ? "高風險：可能改變系統狀態" : "會寫入/送出資料",
    可復原: tool.risk === "dangerous" ? "不一定" : "視情況",
  };
  // 2.6.2 草稿全文預覽：若參數帶「要送出的內容」，把完整草稿附上（給前端用捲動框完整預覽、不截斷成 200 字）
  for (const k of CONTENT_ARG_KEYS) {
    const v = args?.[k];
    if (typeof v === "string" && v.trim().length > 0) { base["草稿全文"] = v.slice(0, 4000); break; }
  }
  return base;
}
