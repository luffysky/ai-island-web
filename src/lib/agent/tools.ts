// Agent 平台 — Tool SDK + registry + MVP 工具集。對齊 docs/agent_platform_plan.md §6/§8。
// 風險等級：read=自動、write=執行前確認、dangerous=強制逐次確認。
// MVP：web.fetch / dictionary.lookup 走伺服器真的能跑；device.* 是 stub（Phase 1b 接 Electron Bridge 才真的動使用者的機器）。
import { createSupabaseAdmin } from "@/lib/supabase-admin";

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

export const TOOLS: AgentTool[] = [
  {
    name: "web.fetch",
    description: "抓一個網址、回傳它的標題與主要文字內容（唯讀、安全）。用來查資料、讀網頁。",
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
export function approvalSummary(tool: AgentTool, args: any): Record<string, string> {
  return {
    動作: `${tool.name} ${JSON.stringify(args ?? {}).slice(0, 200)}`,
    位置: String(args?.path ?? args?.url ?? args?.command ?? "—"),
    影響: tool.risk === "dangerous" ? "高風險：可能改變系統狀態" : "會寫入/送出資料",
    可復原: tool.risk === "dangerous" ? "不一定" : "視情況",
  };
}
