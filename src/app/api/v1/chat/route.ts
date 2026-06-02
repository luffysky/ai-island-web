import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getProviderKey } from "@/lib/ai-crypto";
import { getModelNameForUsage } from "@/lib/ai-usage-models";
import { callAI } from "@/lib/ai-providers";
import { enforceRateLimit, clientIp } from "@/lib/with-rate-limit";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

function providerFromModel(model: string): "anthropic" | "openai" | "google" | "groq" {
  if (/^claude/i.test(model)) return "anthropic";
  if (/^gemini/i.test(model)) return "google";
  if (/^(llama|mixtral)/i.test(model)) return "groq";
  return "openai";
}

/**
 * 對外公開 chat API v1
 * POST /api/v1/chat
 * Header: Authorization: Bearer aii_xxx
 * Body: { messages: [{role,content}], temperature?, max_tokens? }
 */
export async function POST(req: NextRequest) {
  try {
    return await handle(req);
  } catch (e: any) {
    console.error("[v1/chat] uncaught:", e?.stack || e?.message || e);
    return NextResponse.json({ error: e?.message?.slice(0, 200) ?? "internal_error" }, { status: 500 });
  }
}

async function handle(req: NextRequest) {
  // 粗分流：同一 IP 防 key 暴力猜測（每分鐘 60 次）
  const ipLimited = enforceRateLimit({ key: `v1chat:ip:${clientIp(req)}`, limit: 60, windowMs: 60_000 });
  if (ipLimited) return ipLimited;

  // 認證
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(aii_[A-Za-z0-9]+)$/);
  if (!m) return NextResponse.json({ error: "missing or malformed Authorization: Bearer aii_xxx" }, { status: 401 });
  const plain = m[1];
  const hash = crypto.createHash("sha256").update(plain).digest("hex");

  const admin = createSupabaseAdmin();
  const { data: keyRow } = await admin
    .from("api_keys_v1")
    .select("id, user_id, name, quota_per_month, used_this_month, quota_reset_at, active")
    .eq("key_hash", hash)
    .maybeSingle();
  if (!keyRow) return NextResponse.json({ error: "invalid api key" }, { status: 401 });
  if (!(keyRow as any).active) return NextResponse.json({ error: "key disabled" }, { status: 403 });

  // per-key 突發保護（每分鐘 30 次）——跟月配額是兩件事
  const keyLimited = enforceRateLimit({ key: `v1chat:key:${(keyRow as any).id}`, limit: 30, windowMs: 60_000 });
  if (keyLimited) return keyLimited;

  // 月配額重設
  const resetAt = new Date((keyRow as any).quota_reset_at).getTime();
  const now = Date.now();
  let usedThisMonth = (keyRow as any).used_this_month ?? 0;
  if (now - resetAt > 30 * 86400_000) {
    usedThisMonth = 0;
    await admin.from("api_keys_v1").update({ used_this_month: 0, quota_reset_at: new Date().toISOString() }).eq("id", (keyRow as any).id);
  }
  if (usedThisMonth >= (keyRow as any).quota_per_month) {
    return NextResponse.json({
      error: "monthly quota exceeded",
      used: usedThisMonth,
      quota: (keyRow as any).quota_per_month,
    }, { status: 429 });
  }

  // request body
  const body = await req.json().catch(() => ({} as any));
  const messages = Array.isArray(body.messages) ? body.messages : null;
  if (!messages || messages.length === 0) return NextResponse.json({ error: "messages[] required" }, { status: 400 });
  for (const m of messages) {
    if (!["system", "user", "assistant"].includes(m.role)) {
      return NextResponse.json({ error: "invalid role" }, { status: 400 });
    }
    if (typeof m.content !== "string" || m.content.length === 0) {
      return NextResponse.json({ error: "content must be non-empty string" }, { status: 400 });
    }
  }
  const temperature = Math.max(0, Math.min(2, Number(body.temperature ?? 0.7)));
  const maxTokens = Math.max(1, Math.min(2000, Number(body.max_tokens ?? 800)));

  // 用平台 default model（admin_assistant）
  const modelName = await getModelNameForUsage("admin_assistant", "claude-haiku-4-5-20251001");
  const provider = providerFromModel(modelName);
  const apiKey = await getProviderKey(provider);
  if (!apiKey) return NextResponse.json({ error: "service unavailable: backend AI key missing" }, { status: 503 });

  try {
    const r = await callAI({ provider, model: modelName, apiKey, messages, temperature, maxTokens });

    // 更新用量（fire-and-forget）
    void admin.from("api_keys_v1").update({
      used_this_month: usedThisMonth + 1,
      last_used_at: new Date().toISOString(),
    }).eq("id", (keyRow as any).id);

    return NextResponse.json({
      ok: true,
      reply: r.text,
      model: modelName,
      usage: {
        used: usedThisMonth + 1,
        quota: (keyRow as any).quota_per_month,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "ai_failed" }, { status: 502 });
  }
}
