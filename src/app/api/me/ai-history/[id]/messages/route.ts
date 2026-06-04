import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();

  // 先確認 conversation 是這個 user 的（ownership gate）
  const { data: conv } = await admin
    .from("ai_conversations")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();
  if (!conv || conv.user_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // 訊息是用 service-role 寫進 ai_messages 的；這裡也用 admin 讀，
  // 才不會因為 ai_messages 的 RLS policy 沒套到 production 而讀到空陣列
  // （owner 已在上面驗過、安全）。
  const { data: messages, error } = await admin
    .from("ai_messages")
    .select("role, content, created_at, model_used")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ messages: messages ?? [] });
}
