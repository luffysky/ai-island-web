import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/chapters/[id]/resources
 * 拿這章 chapter_id 綁定的 external_resources（YT / 書 / 文章 / 工具）
 * 公開可看（不需登入、章節頁就要顯示）
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const chapterId = Number(id);
  if (!Number.isFinite(chapterId)) return NextResponse.json({ resources: [] });

  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("external_resources")
    .select("id, title, short_desc, url, type, source, tags, difficulty, language, is_free, curated_by")
    .eq("active", true)
    .eq("chapter_id", chapterId)
    .order("position", { ascending: true })
    .limit(12);

  return NextResponse.json({ resources: data ?? [] });
}
