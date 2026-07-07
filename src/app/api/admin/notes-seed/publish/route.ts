import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { sanitizeRichHtmlStrict } from "@/lib/rich-html-server";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { authorId, packTitle, packDesc?, priceZ?, notes:[{title,content}] } → 建 notes + 一個 note_product。 */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const b = await req.json().catch(() => ({} as any));
  const authorId = String(b.authorId ?? "");
  const packTitle = String(b.packTitle ?? "").trim().slice(0, 200);
  const packDesc = b.packDesc ? String(b.packDesc).slice(0, 500) : null;
  const priceZ = Math.max(0, Math.min(100000, Math.floor(Number(b.priceZ) || 0)));
  const notes: { title: string; content: string }[] = Array.isArray(b.notes) ? b.notes.filter((n: any) => n?.title && n?.content).slice(0, 30) : [];
  if (!authorId || !packTitle || notes.length === 0) return NextResponse.json({ error: "missing", message: "缺 作者 / 標題 / 筆記" }, { status: 422 });

  const admin = createSupabaseAdmin();
  const { data: persona } = await admin.from("profiles").select("id").eq("id", authorId).maybeSingle();
  if (!persona) return NextResponse.json({ error: "author_not_found" }, { status: 404 });

  const noteIds: string[] = [];
  for (const n of notes) {
    const { data, error } = await admin.from("notes").insert({
      user_id: authorId, title: String(n.title).slice(0, 200), content: sanitizeRichHtmlStrict(String(n.content)),
      category: "官方筆記", tags: ["官方"], is_public: true,
    }).select("id").single();
    if (!error && data) noteIds.push((data as any).id);
  }
  if (noteIds.length === 0) return NextResponse.json({ error: "insert_failed" }, { status: 500 });

  const { data: prod, error: pErr } = await admin.from("note_products").insert({
    seller_id: authorId, title: packTitle, description: packDesc, price_z: priceZ, note_ids: noteIds, is_active: true,
  }).select("id").single();
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, productId: (prod as any).id, notes: noteIds.length, href: `/notes/market/${(prod as any).id}` });
}
