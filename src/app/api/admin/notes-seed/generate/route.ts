import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { decryptKey } from "@/lib/ai-crypto";
import { callAI } from "@/lib/ai-providers";
import { pickModelForUsage } from "@/lib/ai-usage-models";
import { rateLimit } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/** POST { topic, count? } → 生一個「筆記包」草稿：packTitle/packDesc + N 則速查筆記。 */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;
  const rl = rateLimit(`notes-seed:${gate.userId}`, 40, 3600_000);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited", retry_after: rl.retryAfter }, { status: 429 });

  const body = await req.json().catch(() => ({} as any));
  const count = Math.max(3, Math.min(10, Number(body.count) || 6));
  const topic = String(body.topic ?? "").slice(0, 200) || "Python 入門";

  const admin = createSupabaseAdmin();
  const { data: models } = await admin.from("ai_models").select("*").eq("is_active", true);
  if (!models || models.length === 0) return NextResponse.json({ error: "no_model" }, { status: 503 });
  const model = (await pickModelForUsage("nami_help" as any, models as any[])) ?? (models as any[]).find((m) => m.provider === "anthropic") ?? (models as any[])[0];
  const { data: sysKey } = await admin.from("ai_api_keys").select("api_key_encrypted, enabled").eq("provider", model.provider).maybeSingle();
  if (!sysKey || !(sysKey as any).enabled) return NextResponse.json({ error: "no_api_key" }, { status: 503 });
  let apiKey: string;
  try { apiKey = decryptKey((sysKey as any).api_key_encrypted); } catch { return NextResponse.json({ error: "decrypt_failed" }, { status: 500 }); }

  const system = `你是 AI 島的「筆記包」產生器。針對一個主題，生一個新手友善的速查筆記包（一組短筆記）。
主題：${topic}
規則：
1. packTitle：這包的名字（可帶 emoji）。packDesc：一句話介紹。
2. notes：${count} 則短筆記，每則 { title, content }。content 是 HTML（<p>、程式碼 <pre><code> 把 < > 轉 &lt; &gt;），簡潔速查風、新手看得懂、每則 2~5 句 + 可有一小段 code。
3. 不誇大、不掛保證。
只回 JSON（不要 markdown fence）：{"packTitle":"","packDesc":"","notes":[{"title":"","content":"<p>…</p>"}]}`;

  try {
    const r = await callAI({
      provider: model.provider, model: model.model_name, apiKey,
      messages: [{ role: "system", content: system }, { role: "user", content: `主題「${topic}」，生 ${count} 則的筆記包，回 JSON。` }],
      temperature: 0.85, maxTokens: 4000,
    });
    const text = r.text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch {
      const s = text.indexOf("{"), e = text.lastIndexOf("}");
      if (s >= 0 && e > s) { try { parsed = JSON.parse(text.slice(s, e + 1)); } catch { /* noop */ } }
    }
    const notes = Array.isArray(parsed?.notes) ? parsed.notes.filter((n: any) => n?.title && n?.content).slice(0, count) : [];
    if (!notes.length) return NextResponse.json({ error: "parse_failed", raw: text.slice(0, 400) }, { status: 500 });
    return NextResponse.json({ ok: true, packTitle: parsed.packTitle ?? topic, packDesc: parsed.packDesc ?? "", notes });
  } catch (e: any) {
    return NextResponse.json({ error: "ai_failed", message: e?.message }, { status: 500 });
  }
}
