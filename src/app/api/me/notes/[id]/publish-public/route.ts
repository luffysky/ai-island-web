import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase";

/** POST /api/me/notes/[id]/publish-public { category?, isPublic? } → 發佈/取消發佈筆記到公開筆記牆。 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const isPublic = body.isPublic !== false; // 預設發佈
  const patch: any = { is_public: isPublic, updated_at: new Date().toISOString() };
  if (typeof body.category === "string" && body.category.trim()) patch.category = body.category.trim().slice(0, 40);

  const { data, error } = await supabase.from("notes").update(patch).eq("id", id).eq("user_id", user.id).select("id, is_public, category").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found", message: "找不到你的這則筆記" }, { status: 404 });
  return NextResponse.json({ ok: true, note: data });
}
