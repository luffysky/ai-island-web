import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { loadCareerData, hasAnyCareerData, buildBioPrompt, generateJobKitMarkdown } from "@/lib/job-kit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** POST { focus? } → { markdown } 自傳。免費每月 3 次（bio）、Premium 無限。 */
export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { requireAiAction, consumeAiTokens } = await import("@/lib/ai-gate");
  const gate = await requireAiAction(user.id, "bio");
  if (!gate.ok) return NextResponse.json({ error: gate.error, reason: gate.reason }, { status: 429 });

  const body = await req.json().catch(() => ({} as any));
  const focus = typeof body.focus === "string" ? body.focus.slice(0, 500) : undefined;

  const admin = createSupabaseAdmin();
  const data = await loadCareerData(admin, user.id);
  if (!hasAnyCareerData(data)) {
    return NextResponse.json({
      ok: true,
      markdown: `（還沒有可以寫進自傳的資料。先在履歷頁補個人簡介，或來上一課、做個作品，再回來生成。）`,
      empty: true,
    });
  }

  const result = await generateJobKitMarkdown(buildBioPrompt(data, focus));
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });

  if (gate.chargeable && result.tokens > 0) await consumeAiTokens(user.id, result.tokens);
  return NextResponse.json({ ok: true, markdown: result.markdown, model: result.model });
}
