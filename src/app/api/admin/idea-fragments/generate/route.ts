import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/rate-limit";
import { generateIdeaRows, fetchSurprisingPairs, type SurprisingPair } from "@/lib/idea-ai";
import { likedStyleSummary } from "@/lib/idea-feedback";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 90;

/**
 * POST /api/admin/idea-fragments/generate  { fragmentIds?: string[], count?: number }
 *   從碎片重組出 3~5 個新點子、存進 generated_ideas（saved=false）、回 { ideas }
 *   沒給 fragmentIds → 取最近 40 個碎片
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role, is_owner").eq("id", user.id).maybeSingle();
  if (!(profile?.role === "admin" || (profile as any)?.is_owner === true)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const rl = rateLimit(`idea-generate:${user.id}`, 30, 3600_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited", retry_after: rl.retryAfter }, { status: 429 });

  const body = await req.json().catch(() => ({} as any));
  const count = Math.min(Math.max(Number(body.count) || 3, 1), 5);
  const fragmentIds: string[] = Array.isArray(body.fragmentIds) ? body.fragmentIds.map(String) : [];
  const folderId: string | null = body.folderId ? String(body.folderId) : null;

  const admin = createSupabaseAdmin();
  let q = admin.from("idea_fragments").select("id, title, content, tags, mood, category").order("created_at", { ascending: false });
  if (fragmentIds.length > 0) q = q.in("id", fragmentIds);        // 手選的碎片優先
  else if (folderId) q = q.eq("folder_id", folderId).limit(60);   // 指定資料夾
  else q = q.limit(40);                                            // 最近 40 個

  const { data: frags } = await q;
  const fragments = (frags as any[]) ?? [];
  if (fragments.length < 2) {
    return NextResponse.json({ error: "not_enough_fragments", message: "至少要 2 個碎片才能重組點子" }, { status: 400 });
  }

  // 沒手選碎片時 → 撈語意「意外配對」當提示（手選時就尊重使用者的選擇、不另外塞）
  let surprisingPairs: SurprisingPair[] = [];
  if (fragmentIds.length === 0) {
    surprisingPairs = await fetchSurprisingPairs({ count: 6, folder: folderId });
  }
  const likedStyle = await likedStyleSummary();

  const gen = await generateIdeaRows({ fragments, count, userId: user.id, surprisingPairs, likedStyle });
  if (!gen.ok) return NextResponse.json({ error: gen.error, message: gen.message, raw: gen.raw }, { status: gen.status });

  const rows = gen.rows.map((r) => ({ ...r, saved: false }));
  const { data: inserted, error } = await admin.from("generated_ideas").insert(rows).select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ideas: inserted ?? [] });
}
