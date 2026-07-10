// Agent 平台 Phase 4 骨架 — MCP client：連 MCP server、發現工具、正規化成 AgentTool。
// 讓 Agent 用同一套 registry / 權限 / 逐次確認去用 MCP 工具（先支援我們自己的 /api/mcp）。
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import type { AgentTool, RiskLevel } from "./tools";

export interface McpServer { id: string; name: string; url: string; auth_header?: string | null; }
interface McpToolDef { name: string; description?: string; inputSchema?: any; annotations?: { readOnlyHint?: boolean } }

// MCP Streamable HTTP transport：支援 JSON 或 SSE 回應 + Mcp-Session-Id + initialized 通知。
// 相容我們自家（純 JSON、無 session）與外部 server（SSE + session）。
let idc = 1;
const CLIENT_INFO = { name: "ai-island-agent", version: "0.1.0" };

async function rpcRaw(server: McpServer, body: any, sessionId?: string): Promise<{ json: any; sid?: string; ok: boolean; status: number }> {
  const res = await fetch(server.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(server.auth_header ? { Authorization: server.auth_header } : {}),
      ...(sessionId ? { "Mcp-Session-Id": sessionId } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const sid = res.headers.get("mcp-session-id") ?? sessionId;
  const ct = res.headers.get("content-type") ?? "";
  let json: any = null;
  if (ct.includes("text/event-stream")) {
    const text = await res.text();
    for (const line of text.split("\n")) {
      if (!line.startsWith("data:")) continue;
      try { const p = JSON.parse(line.slice(5).trim()); if (p?.id === body.id) { json = p; break; } if (!json) json = p; } catch { /* skip */ }
    }
  } else {
    json = await res.json().catch(() => null);
  }
  return { json, sid, ok: res.ok, status: res.status };
}

async function openSession(server: McpServer): Promise<string | undefined> {
  const init = await rpcRaw(server, { jsonrpc: "2.0", id: idc++, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: CLIENT_INFO } });
  if (!init.ok) throw new Error(`initialize → ${init.status}`);
  if (init.json?.error) throw new Error(`initialize: ${init.json.error.message}`);
  await rpcRaw(server, { jsonrpc: "2.0", method: "notifications/initialized" }, init.sid).catch(() => {});   // 通知、無回應
  return init.sid;
}

async function callMethod(server: McpServer, method: string, params: any, sid?: string): Promise<any> {
  const r = await rpcRaw(server, { jsonrpc: "2.0", id: idc++, method, params }, sid);
  if (!r.ok) throw new Error(`${method} → ${r.status}`);
  if (r.json?.error) throw new Error(`${method}: ${r.json.error.message}`);
  return r.json?.result;
}

/** 連線（initialize + initialized）+ 列出工具。 */
export async function listMcpTools(server: McpServer): Promise<McpToolDef[]> {
  const sid = await openSession(server);
  const r = await callMethod(server, "tools/list", {}, sid);
  return (r?.tools ?? []) as McpToolDef[];
}

/** 呼叫一個 MCP 工具，回文字結果。 */
export async function callMcpTool(server: McpServer, name: string, args: any): Promise<{ ok: boolean; text: string }> {
  const sid = await openSession(server);
  const r = await callMethod(server, "tools/call", { name, arguments: args ?? {} }, sid);
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
