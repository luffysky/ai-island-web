import { NextRequest, NextResponse } from "next/server";
import { verifyCronAuth } from "@/lib/cron-auth";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { notifyAdmin } from "@/lib/notify-admin";
import { generateIdeaRows, fetchSurprisingPairs } from "@/lib/idea-ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 90;

/**
 * 每週「我幫你發現了一個你沒注意到的連結」主動推播。
 * cron-job.org 設每週一次打 ?secret=$CRON_SECRET。
 * 撈語意意外配對 → AI 重組成 1 個點子 → 存檔 + 推 LINE/TG/Discord 給林董。
 */
export async function GET(req: NextRequest) {
  const authErr = verifyCronAuth(req);
  if (authErr) return authErr;

  const admin = createSupabaseAdmin();

  const pairs = await fetchSurprisingPairs({ count: 5 });
  if (pairs.length === 0) {
    return NextResponse.json({ ok: true, skipped: "no_pairs（碎片不夠或還沒建語意向量）" });
  }

  // 用意外配對涉及的碎片當素材
  const ids = Array.from(new Set(pairs.flatMap((p) => [p.a_id, p.b_id])));
  const { data: frags } = await admin
    .from("idea_fragments")
    .select("id, title, content, tags, mood, category")
    .in("id", ids);
  const fragments = (frags as any[]) ?? [];
  if (fragments.length < 2) return NextResponse.json({ ok: true, skipped: "not_enough_fragments" });

  const { data: owner } = await admin.from("profiles").select("id").eq("is_owner", true).maybeSingle();

  const gen = await generateIdeaRows({ fragments, count: 1, userId: (owner as any)?.id ?? "", surprisingPairs: pairs });
  if (!gen.ok) return NextResponse.json({ ok: false, error: gen.error, message: gen.message }, { status: 200 });

  const row = { ...gen.rows[0], saved: false };
  const { data: idea } = await admin.from("generated_ideas").insert(row).select("*").single();

  const slug = process.env.NEXT_PUBLIC_ADMIN_SLUG || "console-x7k2";
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const link = `${site}/${slug}/admin/idea-fragments`;
  const conn = (idea?.connections?.[0] as string) || (idea?.why_it_works as string) || "";

  await notifyAdmin({
    kind: "idea_connection",
    text:
      `🔗 這週我幫你發現了一個連結：\n\n` +
      `💡 ${idea?.title}\n` +
      (idea?.summary ? `${idea.summary}\n` : "") +
      (conn ? `\n為什麼：${conn}\n` : "") +
      `\n看完整點子 → ${link}`,
    dedupeKey: `idea-weekly-${idea?.id}`,
  });

  return NextResponse.json({ ok: true, ideaId: idea?.id, title: idea?.title });
}
