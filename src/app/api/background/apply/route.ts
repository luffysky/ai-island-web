import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { sceneById, type BackgroundSpec } from "@/lib/background/scenes";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "ai_bg";
const COOKIE_MAX_AGE = 31536000; // 1 年

/**
 * 套用/清除使用者背景。
 * body = BackgroundSpec（或 { spec: null } 清除）。
 * 更新 profiles.active_background（跨裝置）+ 設 ai_bg cookie（SSR 首屏）。
 */
export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as
    | BackgroundSpec
    | { spec?: BackgroundSpec };

  // 兩種收法：直接是 spec，或包在 { spec } 內。
  const raw: BackgroundSpec =
    body && typeof body === "object" && "spec" in body
      ? ((body as { spec?: BackgroundSpec }).spec ?? null)
      : ((body as BackgroundSpec) ?? null);

  let spec: BackgroundSpec = null;
  if (raw && typeof raw === "object") {
    if (raw.type !== "procedural" && raw.type !== "gradient") {
      return NextResponse.json({ error: "invalid_type" }, { status: 400 });
    }
    if (raw.type === "procedural") {
      if (!raw.proceduralId || !sceneById(raw.proceduralId)) {
        return NextResponse.json({ error: "unknown_scene" }, { status: 400 });
      }
    }
    if (raw.type === "gradient" && !raw.gradientCss) {
      return NextResponse.json({ error: "missing_gradient" }, { status: 400 });
    }
    // 只保留白名單欄位（避免存進奇怪東西）
    spec = {
      type: raw.type,
      ...(raw.proceduralId ? { proceduralId: raw.proceduralId } : {}),
      ...(raw.gradientCss ? { gradientCss: raw.gradientCss } : {}),
      ...(typeof raw.density === "number" ? { density: raw.density } : {}),
      ...(raw.overlayColor ? { overlayColor: raw.overlayColor } : {}),
      ...(typeof raw.overlayOpacity === "number" ? { overlayOpacity: raw.overlayOpacity } : {}),
      ...(raw.tone ? { tone: raw.tone } : {}),
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ active_background: spec })
    .eq("id", user.id);
  if (error) {
    return NextResponse.json({ error: "db_error", detail: error.message }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true, spec });
  if (spec) {
    res.cookies.set(COOKIE_NAME, encodeURIComponent(JSON.stringify(spec)), {
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      sameSite: "lax",
    });
  } else {
    res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0, sameSite: "lax" });
  }
  return res;
}
