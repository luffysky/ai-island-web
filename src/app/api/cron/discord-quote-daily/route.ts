import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * 每日金句 Discord post — 每天台灣 07:00 推一句 dev_quotes 到 #motivation channel
 *
 * 觸發：GET /api/cron/discord-quote-daily?secret=$CRON_SECRET
 * 排程：cron-job.org 每天 23:00 UTC (= 台灣 07:00)
 *
 * Env: DISCORD_MOTIVATION_WEBHOOK_URL — Discord channel webhook URL
 *      （Discord channel Settings → Integrations → Webhooks → New Webhook）
 *
 * 沒設 env 就 noop 回 200、不報錯
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const got = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (!expected || got !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const webhookUrl = process.env.DISCORD_MOTIVATION_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ ok: true, skipped: "DISCORD_MOTIVATION_WEBHOOK_URL not set" });
  }

  const admin = createSupabaseAdmin();
  const { count } = await admin.from("dev_quotes").select("id", { count: "exact", head: true }).eq("is_active", true);
  const total = count ?? 0;
  if (total === 0) {
    return NextResponse.json({ ok: false, error: "no quotes in dev_quotes" });
  }

  const offset = Math.floor(Math.random() * total);
  const { data: q } = await admin
    .from("dev_quotes")
    .select("quote, author, translation_zh, category")
    .eq("is_active", true)
    .range(offset, offset)
    .single();
  const row = q as any;
  if (!row) return NextResponse.json({ ok: false, error: "fetch failed" });

  const colorByCategory: Record<string, number> = {
    engineering: 0x3b82f6,   // blue
    startup: 0xf97316,       // orange
    debug: 0xef4444,         // red
    mindset: 0x22c55e,       // green
    "中文格言": 0xa855f7,    // purple
    classic: 0xfbbf24,       // gold
  };

  const embed = {
    title: "📜 Today's Quote",
    description: `> ${row.quote}\n\n${row.translation_zh && row.translation_zh !== row.quote ? `📖 ${row.translation_zh}\n\n` : ""}— **${row.author ?? "Unknown"}**`,
    color: colorByCategory[row.category as string] ?? 0x6b7280,
    footer: { text: `AI 島 · dev_quotes (${total} 句輪流) · category: ${row.category ?? "?"}` },
    timestamp: new Date().toISOString(),
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json({ ok: false, status: res.status, body: body.slice(0, 200) });
    }
    return NextResponse.json({ ok: true, quote_preview: row.quote.slice(0, 50), author: row.author });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message });
  }
}
