// Agent 平台 Phase 4 骨架 — MCP client：連 MCP server、發現工具、正規化成 AgentTool。
// 讓 Agent 用同一套 registry / 權限 / 逐次確認去用 MCP 工具（先支援我們自己的 /api/mcp）。
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import type { AgentTool, RiskLevel } from "./tools";

export interface McpServer { id: string; name: string; url: string; auth_header?: string | null; }
interface McpToolDef { name: string; description?: string; inputSchema?: any; annotations?: { readOnlyHint?: boolean } }

let idc = 1;
async function rpc(server: McpServer, method: string, params?: any): Promise<any> {
  const res = await fetch(server.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(server.auth_header ? { Authorization: server.auth_header } : {}) },
    body: JSON.stringify({ jsonrpc: "2.0", id: idc++, method, params }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`MCP ${method} → ${res.status}`);
  const j = await res.json();
  if (j?.error) throw new Error(`MCP ${method}: ${j.error.message}`);
  return j?.result;
}

/** 連線 + 列出工具（先 initialize 再 tools/list）。 */
export async function listMcpTools(server: McpServer): Promise<McpToolDef[]> {
  await rpc(server, "initialize", { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "ai-island-agent", version: "0.1.0" } });
  const r = await rpc(server, "tools/list", {});
  return (r?.tools ?? []) as McpToolDef[];
}

/** 呼叫一個 MCP 工具，回文字結果。 */
export async function callMcpTool(server: McpServer, name: string, args: any): Promise<{ ok: boolean; text: string }> {
  const r = await rpc(server, "tools/call", { name, arguments: args ?? {} });
  const text = (r?.content ?? []).map((c: any) => (c?.type === "text" ? c.text : "")).join("\n");
  return { ok: !r?.isError, text };
}

const sanitize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "srv";

/** MCP 工具 → AgentTool（命名空間 mcp:<server>/<tool>；readOnlyHint→read，否則保守當 write 要確認）。 */
export function mcpToAgentTool(server: McpServer, def: McpToolDef): AgentTool {
  const risk: RiskLevel = def.annotations?.readOnlyHint ? "read" : "write";
  const props = def.inputSchema?.properties ?? {};
  const args: Record<string, string> = {};
  for (const k of Object.keys(props)) args[k] = String(props[k]?.description ?? props[k]?.type ?? "");
  return {
    name: `mcp:${sanitize(server.name)}/${def.name}`,
    description: `(MCP·${server.name}) ${def.description ?? def.name}`,
    args,
    risk,
    platforms: ["server"],
    async execute(a: any) {
      try {
        const r = await callMcpTool(server, def.name, a);
        return r.ok ? { ok: true, data: { text: r.text } } : { ok: false, error: r.text || "MCP 工具回報錯誤" };
      } catch (e: any) { return { ok: false, error: e?.message ?? "MCP 呼叫失敗" }; }
    },
  };
}

/** 撈使用者所有啟用的 MCP server、發現工具、正規化成 AgentTool（單一 server 失敗不影響其他）。 */
export async function loadUserMcpTools(userId: string): Promise<AgentTool[]> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("agent_mcp_servers").select("id, name, url, auth_header").eq("user_id", userId).eq("enabled", true);
  const servers = (data ?? []) as McpServer[];
  const out: AgentTool[] = [];
  for (const s of servers) {
    try {
      const defs = await listMcpTools(s);
      for (const d of defs) out.push(mcpToAgentTool(s, d));
    } catch (e: any) { console.warn(`[mcp] ${s.name} 發現工具失敗：`, e?.message); }
  }
  return out;
}
