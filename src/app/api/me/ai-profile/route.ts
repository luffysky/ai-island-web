import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import {
  loadUserMemory,
  setUserAiPreferences,
  invalidateMemoryCache,
} from "@/lib/user-ai-memory";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_TONES = new Set(["short", "detailed", "encouraging", "direct"]);

async function getUserId(): Promise<string | null> {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  return user?.id ?? null;
}

/** GET → { summary, preferences, topics, turn_count } */
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const mem = await loadUserMemory(userId);
  return NextResponse.json({
    summary: mem?.summary ?? null,
    preferences: mem?.preferences ?? {},
    topics: mem?.topics ?? [],
    turn_count: mem?.turn_count ?? 0,
  });
}

/** PATCH { summary?, custom_prompt?, tone?, remember_enabled? } → 更新 summary + preferences */
export async function PATCH(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const b = await req.json().catch(() => ({} as any));
  const prefsPatch: Record<string, any> = {};

  if ("custom_prompt" in b) {
    prefsPatch.custom_prompt = typeof b.custom_prompt === "string" ? b.custom_prompt.slice(0, 2000) : "";
  }
  if ("tone" in b) {
    if (b.tone === null || b.tone === "") prefsPatch.tone = "";
    else if (typeof b.tone === "string" && VALID_TONES.has(b.tone)) prefsPatch.tone = b.tone;
    else return NextResponse.json({ error: "invalid_tone" }, { status: 422 });
  }
  if ("remember_enabled" in b) {
    prefsPatch.remember_enabled = !!b.remember_enabled;
  }

  const patch: { summary?: string | null; preferences?: Record<string, any> } = {};
  if (Object.keys(prefsPatch).length) patch.preferences = prefsPatch;
  if ("summary" in b) {
    patch.summary = b.summary == null ? null : String(b.summary).slice(0, 4000);
  }

  if (!("summary" in patch) && !patch.preferences) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 422 });
  }

  const mem = await setUserAiPreferences(userId, patch);
  return NextResponse.json({
    ok: true,
    summary: mem?.summary ?? null,
    preferences: mem?.preferences ?? {},
    topics: mem?.topics ?? [],
    turn_count: mem?.turn_count ?? 0,
  });
}

/** DELETE → 清除所有記憶（summary=null, preferences={}, topics=[]） */
export async function DELETE() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin();
  await admin
    .from("user_ai_memory")
    .upsert(
      {
        user_id: userId,
        summary: null,
        preferences: {},
        topics: [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  invalidateMemoryCache(userId);
  return NextResponse.json({ ok: true });
}
