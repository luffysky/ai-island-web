import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // 先確認 conversation 是這個 user 的
  const { data: conv } = await supabase
    .from("ai_conversations")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();
  if (!conv || conv.user_id !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: messages } = await supabase
    .from("ai_messages")
    .select("role, content, created_at, model_used")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ messages: messages ?? [] });
}
