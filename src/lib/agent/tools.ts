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
];

export function getTool(name: string): AgentTool | undefined {
  return TOOLS.find((t) => t.name === name);
}

/** 給 LLM 的工具清單描述（含風險、參數）。allowed 非空時只列該子集（技能限制工具用）。 */
export function describeTools(allowed?: string[]): string {
  const list = allowed && allowed.length ? TOOLS.filter((t) => allowed.includes(t.name)) : TOOLS;
  return list.map((t) =>
    `- ${t.name}（${t.risk}${t.needsDevice ? "、需桌面助手" : ""}）：${t.description} 參數：${JSON.stringify(t.args)}`
  ).join("\n");
}

/** 工具是否在技能允許集內（allowed 空 = 全部允許）。 */
export function toolAllowed(name: string, allowed?: string[]): boolean {
  return !allowed || allowed.length === 0 || allowed.includes(name);
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
