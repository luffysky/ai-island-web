import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { listMcpTools, mcpToAgentTool, type McpServer } from "@/lib/agent/mcp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/agent/mcp — 我的 MCP servers + 各自發現到的工具（best-effort）
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("agent_mcp_servers").select("id, name, url, enabled").eq("user_id", user.id).order("created_at");
  const servers = await Promise.all((data ?? []).map(async (s: any) => {
    let tools: { name: string; risk: string }[] = [];
    try {
      const defs = await listMcpTools(s as McpServer);
      tools = defs.map((d) => { const t = mcpToAgentTool(s as McpServer, d); return { name: t.name, risk: t.risk }; });
    } catch { /* server 離線就空 */ }
    return { ...s, tools };
  }));
  return NextResponse.json({ servers });
}

// POST /api/agent/mcp { name, url, auth_header? } — 新增（先驗證連得上、列得到工具）
export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({} as any));
  const name = String(b.name ?? "").trim().slice(0, 40);
  const url = String(b.url ?? "").trim();
  if (!name || !/^https?:\/\//.test(url)) return NextResponse.json({ error: "需要名稱與 http(s) 網址" }, { status: 400 });
  const auth_header = b.auth_header ? String(b.auth_header).slice(0, 500) : null;

  // 驗證：連得上且列得到工具
  let toolCount = 0;
  try {
    const defs = await listMcpTools({ id: "", name, url, auth_header } as McpServer);
    toolCount = defs.length;
  } catch (e: any) {
    return NextResponse.json({ error: `連線失敗：${e?.message ?? e}` }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { count } = await admin.from("agent_mcp_servers").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((count ?? 0) >= 10) return NextResponse.json({ error: "MCP server 已達上限（10）" }, { status: 400 });
  const { data, error } = await admin.from("agent_mcp_servers").insert({ user_id: user.id, name, url, auth_header }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id, toolCount });
}

// DELETE /api/agent/mcp?id=<uuid>
export async function DELETE(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("agent_mcp_servers").delete().eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
