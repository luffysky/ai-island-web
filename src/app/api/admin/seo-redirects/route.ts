import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// §7.0.1 SEO 轉址後台 CRUD。middleware 讀「啟用中」規則套 301/302（見 src/middleware.ts）。
// from_path：站內路徑（/ 開頭）。to_path：站內路徑或完整外部網址（http(s)://）。

const ALLOWED_STATUS = [301, 302, 307, 308];

function normPath(v: unknown): string {
  return String(v ?? "").trim();
}
function validFrom(p: string): boolean {
  // 站內來源路徑：/ 開頭、不含協定與空白、長度合理
  return /^\/[^\s?#]{0,300}$/.test(p);
}
function validTo(p: string): boolean {
  if (/^https?:\/\/[^\s]{1,500}$/.test(p)) return true;   // 外部完整網址
  return /^\/[^\s]{0,300}$/.test(p);                        // 站內路徑
}

// GET — 全部規則（後台列表，含未啟用）
export async function GET() {
  const gate = await requireStaff(["admin", "editor"]);
  if (!gate.ok) return gate.response;
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("seo_redirects").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ redirects: data ?? [] });
}

// POST — 新增
export async function POST(req: NextRequest) {
  const gate = await requireStaff(["admin", "editor"]);
  if (!gate.ok) return gate.response;
  const b = await req.json().catch(() => ({} as any));
  const from_path = normPath(b.from_path);
  const to_path = normPath(b.to_path);
  const status_code = ALLOWED_STATUS.includes(Number(b.status_code)) ? Number(b.status_code) : 301;
  if (!validFrom(from_path)) return NextResponse.json({ error: "from_path 要以 / 開頭的站內路徑" }, { status: 400 });
  if (!validTo(to_path)) return NextResponse.json({ error: "to_path 要是站內路徑(/…)或完整外部網址(http(s)://…)" }, { status: 400 });
  if (from_path === to_path) return NextResponse.json({ error: "來源與目的不能相同" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("seo_redirects")
    .insert({ from_path, to_path, status_code, enabled: b.enabled === false ? false : true })
    .select("*").single();
  if (error) {
    const msg = /duplicate|unique/i.test(error.message) ? "這個 from_path 已有規則" : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ redirect: data });
}

// PATCH ?id= — 編輯 / 啟用停用
export async function PATCH(req: NextRequest) {
  const gate = await requireStaff(["admin", "editor"]);
  if (!gate.ok) return gate.response;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  const b = await req.json().catch(() => ({} as any));
  const patch: Record<string, any> = {};
  if (b.to_path !== undefined) {
    const to_path = normPath(b.to_path);
    if (!validTo(to_path)) return NextResponse.json({ error: "to_path 格式錯" }, { status: 400 });
    patch.to_path = to_path;
  }
  if (b.status_code !== undefined && ALLOWED_STATUS.includes(Number(b.status_code))) patch.status_code = Number(b.status_code);
  if (typeof b.enabled === "boolean") patch.enabled = b.enabled;
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: "沒有可更新的欄位" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from("seo_redirects").update(patch).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ redirect: data });
}

// DELETE ?id=
export async function DELETE(req: NextRequest) {
  const gate = await requireStaff(["admin", "editor"]);
  if (!gate.ok) return gate.response;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺 id" }, { status: 400 });
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("seo_redirects").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
