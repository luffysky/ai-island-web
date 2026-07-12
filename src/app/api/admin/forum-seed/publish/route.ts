import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { sanitizeRichHtmlStrict } from "@/lib/rich-html-server";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** POST { boardId, personaId, title, content(HTML), tags[], views? } → { thread } 以虛擬住民身分發到討論區。 */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const b = await req.json().catch(() => ({} as any));
  const boardId = String(b.boardId ?? "");
  const personaId = String(b.personaId ?? "");
  const title = String(b.title ?? "").trim().slice(0, 200);
  const content = sanitizeRichHtmlStrict(String(b.content ?? ""));
  const tags: string[] = Array.isArray(b.tags) ? b.tags.map((t: any) => String(t).slice(0, 50)).slice(0, 8) : [];
  if (!boardId || !personaId || !title) return NextResponse.json({ error: "missing", message: "缺 版塊 / 作者 / 標題" }, { status: 422 });

  const admin = createSupabaseAdmin();
  // 驗證版塊 + 作者存在（作者必須是既有 profile，通常是虛擬 AI 住民）
  const [{ data: board }, { data: persona }] = await Promise.all([
    admin.from("forum_boards").select("id").eq("id", boardId).maybeSingle(),
    admin.from("profiles").select("id, username").eq("id", personaId).maybeSingle(),
  ]);
  if (!board) return NextResponse.json({ error: "board_not_found" }, { status: 404 });
  if (!persona) return NextResponse.json({ error: "persona_not_found" }, { status: 404 });

  const { data: thread, error } = await admin.from("forum_threads").insert({
    board_id: boardId, user_id: personaId, title, content, tags, view_count: 0, // 不灌假觀看數
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, thread });
}
