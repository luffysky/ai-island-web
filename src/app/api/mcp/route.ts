import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// AI 島自家 MCP server（Model Context Protocol，JSON-RPC 2.0 over HTTP）——骨架版。
// 對外揭露幾個安全唯讀工具，驗證「Agent 以 MCP 協定消費工具」的管線。之後可擴充。

const SERVER_INFO = { name: "ai-island-mcp", version: "0.1.0" };

const MCP_TOOLS = [
  {
    name: "dictionary_lookup",
    description: "查 AI 島程式辭典的白話解釋（唯讀）。",
    inputSchema: { type: "object", properties: { term: { type: "string", description: "術語或關鍵字" } }, required: ["term"] },
    annotations: { readOnlyHint: true },
    async run(args: any) {
      const term = String(args?.term ?? "").replace(/[%,()*]/g, " ").trim().slice(0, 60);
      if (!term) return "缺 term";
      const admin = createSupabaseAdmin();
      const { data } = await admin.from("dictionary_terms").select("term, zh_name, plain, analogy").or(`term.ilike.%${term}%,zh_name.ilike.%${term}%`).limit(3);
      return data && data.length ? JSON.stringify(data) : "辭典裡沒有這個詞";
    },
  },
  {
    name: "island_info",
    description: "回傳 AI 島這個學習平台的基本介紹（唯讀）。",
    inputSchema: { type: "object", properties: {}, required: [] },
    annotations: { readOnlyHint: true },
    async run() {
      return "AI 島是繁體中文的程式學習平台：章節課程、程式辭典、每日測驗、創作者島、行動代理(Agent)。站點 ai-island-web.snowrealm.pet。";
    },
  },
];

function rpcResult(id: any, result: any) { return { jsonrpc: "2.0", id, result }; }
function rpcError(id: any, code: number, message: string) { return { jsonrpc: "2.0", id, error: { code, message } }; }

async function handleOne(msg: any) {
  const { id, method, params } = msg ?? {};
  switch (method) {
    case "initialize":
      return rpcResult(id, { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: SERVER_INFO });
    case "ping":
      return rpcResult(id, {});
    case "tools/list":
      return rpcResult(id, { tools: MCP_TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema, annotations: t.annotations })) });
    case "tools/call": {
      const tool = MCP_TOOLS.find((t) => t.name === params?.name);
      if (!tool) return rpcError(id, -32602, `unknown tool ${params?.name}`);
      try {
        const text = await tool.run(params?.arguments ?? {});
        return rpcResult(id, { content: [{ type: "text", text: String(text) }] });
      } catch (e: any) {
        return rpcResult(id, { content: [{ type: "text", text: `工具錯誤：${e?.message ?? e}` }], isError: true });
      }
    }
    default:
      if (id === undefined) return null;           // notification，不回
      return rpcError(id, -32601, `method not found: ${method}`);
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map(handleOne))).filter(Boolean);
    return NextResponse.json(out);
  }
  const res = await handleOne(body);
  return NextResponse.json(res ?? {});
}

// 方便瀏覽器/健檢看到這是 MCP 端點
export async function GET() {
  return NextResponse.json({ server: SERVER_INFO, transport: "http-jsonrpc", tools: MCP_TOOLS.map((t) => t.name) });
}
