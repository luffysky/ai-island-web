import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { parseOpenApiToTools, isSafePublicUrl } from "@/lib/agent/openapi-tools";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/agent/openapi — 我的 OpenAPI 來源 + 各自發現到的工具數
export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("agent_openapi_sources")
    .select("id, name, spec_url, base_url, enabled").eq("user_id", user.id).order("created_at");
  return NextResponse.json({ sources: data ?? [] });
}

// POST /api/agent/openapi { name, spec_url, base_url?, auth_header? } — 新增（先抓 spec 驗證能發現到工具）
export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({} as any));
  const name = String(b.name ?? "").trim().slice(0, 40);
  const spec_url = String(b.spec_url ?? "").trim();
  const base_url = b.base_url ? String(b.base_url).trim().slice(0, 300) : null;
  const auth_header = b.auth_header ? String(b.auth_header).slice(0, 500) : null;
  if (!name || !isSafePublicUrl(spec_url)) return NextResponse.json({ error: "需要名稱與合法的 http(s) spec 網址（不可內網）" }, { status: 400 });
  if (base_url && !isSafePublicUrl(base_url)) return NextResponse.json({ error: "base URL 不合法（不可內網）" }, { status: 400 });

  // 驗證：抓 spec、轉得出工具
  let toolCount = 0;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    let spec: any;
    try { const r = await fetch(spec_url, { headers: { Accept: "application/json" }, signal: ctrl.signal }); spec = await r.json(); }
    finally { clearTimeout(timer); }
    toolCount = parseOpenApiToTools(spec, { namespace: name, baseUrl: base_url }).length;
  } catch (e: any) {
    return NextResponse.json({ error: `抓取/解析 spec 失敗：${e?.message ?? e}` }, { status: 400 });
  }
  if (toolCount === 0) return NextResponse.json({ error: "這份 spec 沒有可用的 operation" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { count } = await admin.from("agent_openapi_sources").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((count ?? 0) >= 10) return NextResponse.json({ error: "OpenAPI 來源已達上限（10）" }, { status: 400 });
  const { data, error } = await admin.from("agent_openapi_sources").insert({ user_id: user.id, name, spec_url, base_url, auth_header }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id, toolCount });
}

// DELETE /api/agent/openapi?id=xxx
export async function DELETE(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  const admin = createSupabaseAdmin();
  await admin.from("agent_openapi_sources").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
