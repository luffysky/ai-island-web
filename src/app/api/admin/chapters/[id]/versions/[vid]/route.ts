import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// GET /api/admin/chapters/[id]/versions/[vid] — 取單一版本完整 content
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; vid: string }> },
) {
  const { id, vid } = await params;
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  // 驗 vid 是不是 UUID 格式、避免 PostgREST 收到 "1" 之類非 UUID 字串噴 500
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(vid)) {
    return NextResponse.json({ error: "invalid_vid" }, { status: 400 });
  }

  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from("chapter_versions")
    .select("id, chapter_id, version, content, saved_at, note")
    .eq("chapter_id", Number(id))
    .eq("id", vid)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(data);
}
