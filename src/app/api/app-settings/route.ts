import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 公開 app_settings 讀取（whitelist 只允許 lottie URL 等對外可見的設定）
 * GET /api/app-settings?keys=pet_lottie_hamster_url,pet_lottie_cat_url,...
 *
 * 林董：不要把全部設定都暴露、只開特定 prefix key、不洩漏 API key 等敏感資料
 */
const PUBLIC_PREFIXES = ["pet_lottie_", "home_hero_lottie_url", "chapter_hero_lottie_url", "login_lottie_url", "empty_state_lottie_url", "ai_chat_lottie_url", "loading_lottie_url", "celebration_lottie_url"];

function isPublic(key: string): boolean {
  return PUBLIC_PREFIXES.some((p) => key === p || key.startsWith(p));
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const keysParam = url.searchParams.get("keys") ?? "";
  const requestedKeys = keysParam.split(",").map((k) => k.trim()).filter(Boolean);
  const allowed = requestedKeys.filter(isPublic);
  if (allowed.length === 0) return NextResponse.json({ settings: {} });

  const admin = createSupabaseAdmin();
  const { data } = await admin.from("app_settings").select("key, value").in("key", allowed);
  const settings: Record<string, string> = {};
  for (const row of ((data ?? []) as any[])) {
    const v = row.value;
    if (typeof v === "string") settings[row.key] = v;
    else if (v === null) continue;
    else if (typeof v === "object" && v) settings[row.key] = String(v);
  }
  return NextResponse.json({ settings });
}
