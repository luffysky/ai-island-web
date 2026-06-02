import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

async function assertStaff() {
  const gate = await requireStaff(["admin", "teacher", "assistant"]);
  if (!gate.ok) return { error: gate.status === 401 ? ("unauthorized" as const) : ("forbidden" as const), status: gate.status };
  return { ok: true as const, userId: gate.userId };
}

/** GET — 列出所有可用罐頭（共用 + 自己的） */
export async function GET() {
  const a = await assertStaff();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("canned_replies")
    .select("*")
    .or(`owner_user_id.is.null,owner_user_id.eq.${a.userId}`)
    .order("use_count", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ replies: data ?? [] });
}

/** POST — 建一條罐頭 */
export async function POST(req: NextRequest) {
  const a = await assertStaff();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });

  const body = await req.json().catch(() => ({} as any));
  const title = String(body.title ?? "").trim().slice(0, 100);
  const text = String(body.body ?? "").trim().slice(0, 5000);
  if (!title || !text) return NextResponse.json({ error: "title_body_required" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("canned_replies")
    .insert({
      owner_user_id: body.shared ? null : a.userId,
      title,
      body: text,
      category: body.category ? String(body.category).slice(0, 40) : null,
      shortcut: body.shortcut ? String(body.shortcut).slice(0, 40) : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, reply: data });
}
