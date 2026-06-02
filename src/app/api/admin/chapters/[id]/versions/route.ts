import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// GET /api/admin/chapters/[id]/versions — 列出該章節所有版本（不含完整 content、輕量）
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const chapterId = Number(id);
  if (!Number.isFinite(chapterId)) {
    return NextResponse.json({ error: "invalid_chapter_id", message: "chapter_id 必須是數字" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("chapter_versions")
    .select(`
      id, version, saved_at, byte_size, note,
      saved_by_user:profiles!chapter_versions_saved_by_fkey(username, display_name)
    `)
    .eq("chapter_id", chapterId)
    .order("version", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ versions: data ?? [] });
}
