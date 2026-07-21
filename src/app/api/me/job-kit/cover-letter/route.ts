import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { loadCareerData, buildCoverLetterPrompt, generateJobKitMarkdown } from "@/lib/job-kit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST { company, jobTitle, jd?, highlights? } → { markdown } 求職信。免費每月 3 次、Premium 無限。 */
export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const company = String(body.company ?? "").trim().slice(0, 100);
  const jobTitle = String(body.jobTitle ?? "").trim().slice(0, 100);
  if (!company || !jobTitle) {
    return NextResponse.json({ error: "missing_fields", message: "請填公司名稱和應徵職位。" }, { status: 400 });
  }
  const jd = typeof body.jd === "string" ? body.jd.slice(0, 2000) : undefined;
  const highlights = typeof body.highlights === "string" ? body.highlights.slice(0, 800) : undefined;

  const { requireAiAction, consumeAiTokens } = await import("@/lib/ai-gate");
  const gate = await requireAiAction(user.id, "cover_letter");
  if (!gate.ok) return NextResponse.json({ error: gate.error, reason: gate.reason }, { status: 429 });

  const admin = createSupabaseAdmin();
  const data = await loadCareerData(admin, user.id);

  const result = await generateJobKitMarkdown(buildCoverLetterPrompt(data, { company, jobTitle, jd, highlights }));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  if (gate.chargeable && result.tokens > 0) await consumeAiTokens(user.id, result.tokens);
  return NextResponse.json({ ok: true, markdown: result.markdown, model: result.model });
}
