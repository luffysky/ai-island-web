import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { checkOwnerByProfileId } from "@/lib/is-owner";

export const dynamic = "force-dynamic";

/**
 * 取得單一 conversation 的完整 messages — 只 owner 能用。
 * Admin 只能看 metadata（在 /admin/ai/conversations 頁列表）、不能看內容。
 * 這是 user privacy gate：避免一般 admin 偷看林董的私密對話。
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();
  const ownerCheck = await checkOwnerByProfileId(user.id, admin);
  if (!ownerCheck.isOwner) {
    return NextResponse.json(
      { error: "owner_only", message: "只有 owner 可以查看完整對話內容" },
      { status: 403 },
    );
  }

  const { data: messages, error } = await admin
    .from("ai_messages")
    .select("role, content, created_at, model_used, tokens_input, tokens_output, cost_usd")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 順便也拿 conversation header（title / persona / chapter context）
  const { data: conv } = await admin
    .from("ai_conversations")
    .select("title, tone, persona_id, context_chapter_id, context_lesson_id, created_at, use_byok, profiles(username, display_name)")
    .eq("id", id)
    .maybeSingle();

  return NextResponse.json({ conv, messages: messages ?? [] });
}
