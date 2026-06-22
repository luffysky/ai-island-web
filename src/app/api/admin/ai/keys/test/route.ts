/**
 * Admin AI Key 真值測試 — GET /api/admin/ai/keys/test?provider=anthropic
 *
 * 從 DB 拿 key、decrypt、call provider 跑 1 個小請求驗證、回傳真的能不能用。
 *
 * 用途：林董後台貼新 key 後、立刻按按鈕測 + 不用等 LINE bot 跑出 401 才知道。
 *
 * 回傳：
 *   - decrypt_ok: 是否能解密（false = AI_KEY_SECRET 變了 / 加密資料壞了）
 *   - key_prefix / key_suffix: 看是不是預期的 sk-ant-... / sk-...
 *   - key_length: 看長度合不合理（Anthropic ~108 / OpenAI ~51 / Google ~39）
 *   - api_ok: provider 真的接受嗎
 *   - api_status / api_body: 失敗時的詳細
 */
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase";
import { decryptKey } from "@/lib/ai-crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { requireAdmin as adminGate } from "@/lib/admin-guard";

async function requireAdmin() {
  const gate = await adminGate();
  if (!gate.ok) return null;
  return { id: gate.userId, role: gate.role, username: gate.username };
}

async function testAnthropic(key: string): Promise<{ ok: boolean; status?: number; body?: string }> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 10,
        messages: [{ role: "user", content: "hi" }],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) return { ok: true, status: res.status };
    const body = await res.text();
    return { ok: false, status: res.status, body: body.slice(0, 500) };
  } catch (e: any) {
    return { ok: false, body: `fetch failed: ${e?.message ?? "unknown"}` };
  }
}

async function testOpenAI(key: string): Promise<{ ok: boolean; status?: number; body?: string }> {
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) return { ok: true, status: res.status };
    const body = await res.text();
    return { ok: false, status: res.status, body: body.slice(0, 500) };
  } catch (e: any) {
    return { ok: false, body: `fetch failed: ${e?.message ?? "unknown"}` };
  }
}

async function testGoogle(key: string): Promise<{ ok: boolean; status?: number; body?: string }> {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, {
      method: "GET",
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) return { ok: true, status: res.status };
    const body = await res.text();
    return { ok: false, status: res.status, body: body.slice(0, 500) };
  } catch (e: any) {
    return { ok: false, body: `fetch failed: ${e?.message ?? "unknown"}` };
  }
}

async function testOpenRouter(key: string): Promise<{ ok: boolean; status?: number; body?: string }> {
  try {
    // /key 端點回 key 的 label / usage / limit → 驗證 key 有效（免費 key 也可）
    const res = await fetch("https://openrouter.ai/api/v1/key", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) return { ok: true, status: res.status };
    const body = await res.text();
    return { ok: false, status: res.status, body: body.slice(0, 500) };
  } catch (e: any) {
    return { ok: false, body: `fetch failed: ${e?.message ?? "unknown"}` };
  }
}

async function testGroq(key: string): Promise<{ ok: boolean; status?: number; body?: string }> {
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) return { ok: true, status: res.status };
    const body = await res.text();
    return { ok: false, status: res.status, body: body.slice(0, 500) };
  } catch (e: any) {
    return { ok: false, body: `fetch failed: ${e?.message ?? "unknown"}` };
  }
}

export async function GET(req: NextRequest) {
  const me = await requireAdmin();
  if (!me) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const provider = req.nextUrl.searchParams.get("provider") ?? "anthropic";

  const admin = createSupabaseAdmin();
  const { data: row } = await admin
    .from("ai_api_keys")
    .select("api_key_encrypted, enabled, updated_at")
    .eq("provider", provider)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({
      ok: false,
      reason: "no_row",
      hint: `ai_api_keys 表沒有 provider=${provider} 的 row、去 /admin/ai/models 新增`,
    });
  }
  if (!(row as any).enabled) {
    return NextResponse.json({
      ok: false,
      reason: "disabled",
      updated_at: (row as any).updated_at,
      hint: "row 存在但 enabled=false、去 /admin/ai/models 開",
    });
  }

  let decrypted: string;
  try {
    decrypted = decryptKey((row as any).api_key_encrypted);
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      reason: "decrypt_failed",
      error: e?.message,
      hint: "AI_KEY_SECRET env 跟當時加密的不一樣、Zeabur env 對齊；或刪掉這 row 重貼一次",
    });
  }

  // 不暴露完整 key、只顯示頭尾讓林董比對是不是同一支
  const keyInfo = {
    length: decrypted.length,
    prefix: decrypted.slice(0, 12),
    suffix: decrypted.slice(-4),
    has_whitespace: /\s/.test(decrypted),
    expected_prefix:
      provider === "anthropic" ? "sk-ant-..."
        : provider === "openai" ? "sk-..."
        : provider === "google" ? "AIza..."
        : provider === "openrouter" ? "sk-or-..."
        : provider === "groq" ? "gsk_..."
        : "(unknown)",
  };

  let apiResult: { ok: boolean; status?: number; body?: string };
  if (provider === "anthropic") apiResult = await testAnthropic(decrypted);
  else if (provider === "openai") apiResult = await testOpenAI(decrypted);
  else if (provider === "google") apiResult = await testGoogle(decrypted);
  else if (provider === "openrouter") apiResult = await testOpenRouter(decrypted);
  else if (provider === "groq") apiResult = await testGroq(decrypted);
  else apiResult = { ok: false, body: `no test for provider=${provider}` };

  const hint = apiResult.ok
    ? "key 有效、若 LINE bot 仍 401 看是否 cache 或哪邊用錯 key"
    : apiResult.status === 401
      ? "key 真的失效 / 被 revoke / 打錯。去 Anthropic Console 重發一支、複製整段（不要漏字）、後台貼進去"
      : apiResult.status === 429
        ? "key 對、但被限流。看 Anthropic Console 的 usage / billing"
        : "看 api_body 細節";

  return NextResponse.json({
    ok: apiResult.ok,
    provider,
    db_updated_at: (row as any).updated_at,
    decrypt_ok: true,
    key_info: keyInfo,
    api_test: apiResult,
    hint,
  });
}
