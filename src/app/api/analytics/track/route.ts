import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServer } from "@/lib/supabase-server";
import { parseDevice } from "@/lib/analytics-device";

export const runtime = "nodejs";

type TrackBody = {
  eventType?: "page_view" | "heartbeat" | "page_exit" | "custom";
  sessionId?: string;
  visitorId?: string;
  pageViewId?: string;
  path?: string;
  title?: string;
  referrer?: string;
  durationSec?: number;
  scrollMaxPct?: number;
  readComplete?: boolean;
  viewport?: { width?: number; height?: number };
  timezone?: string;
  locale?: string;
  exitReason?: string;
  metadata?: Record<string, unknown>;
};

function clampInt(value: unknown, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function geo(req: NextRequest) {
  return {
    country: req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry"),
    region: req.headers.get("x-vercel-ip-country-region"),
    city: req.headers.get("x-vercel-ip-city"),
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as TrackBody;
  const eventType = body.eventType ?? "heartbeat";

  if (!body.sessionId || !body.visitorId || !body.pageViewId || !body.path) {
    return NextResponse.json({ error: "missing_required_fields" }, { status: 400 });
  }

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createSupabaseAdmin();

  const now = new Date().toISOString();
  const ua = req.headers.get("user-agent");
  const device = parseDevice(ua);
  const location = geo(req);
  const durationSec = clampInt(body.durationSec, 0, 86_400);
  const scrollMaxPct = clampInt(body.scrollMaxPct, 0, 100);
  const viewport_width = clampInt(body.viewport?.width, 0, 20_000) || null;
  const viewport_height = clampInt(body.viewport?.height, 0, 20_000) || null;
  const isExit = eventType === "page_exit";

  const sessionPatch = {
    id: body.sessionId,
    visitor_id: body.visitorId,
    user_id: user?.id ?? null,
    last_seen_at: now,
    ended_at: isExit ? now : null,
    current_path: body.path,
    current_title: body.title ?? null,
    referrer: body.referrer ?? null,
    ...device,
    ...location,
    timezone: body.timezone ?? null,
    locale: body.locale ?? null,
    viewport_width,
    viewport_height,
    total_duration_sec: durationSec,
    max_scroll_pct: scrollMaxPct,
    metadata: body.metadata ?? {},
  };

  const sessionResult = await admin
    .from("analytics_sessions")
    .upsert(sessionPatch, { onConflict: "id" });
  if (sessionResult.error) {
    console.warn("[analytics] session upsert failed:", sessionResult.error.message);
    return NextResponse.json({ ok: true, skipped: "session" });
  }

  if (eventType === "page_view") {
    const rpc = await admin.rpc("analytics_increment_session_page_count", { p_session_id: body.sessionId });
    if (rpc.error) console.warn("[analytics] page count rpc failed:", rpc.error.message);
  }

  const pagePatch = {
    id: body.pageViewId,
    session_id: body.sessionId,
    visitor_id: body.visitorId,
    user_id: user?.id ?? null,
    path: body.path,
    title: body.title ?? null,
    referrer: body.referrer ?? null,
    last_seen_at: now,
    ended_at: isExit ? now : null,
    duration_sec: durationSec,
    scroll_max_pct: scrollMaxPct,
    read_complete: !!body.readComplete || scrollMaxPct >= 90,
    viewport_width,
    viewport_height,
    ...device,
    ...location,
    exit_reason: body.exitReason ?? null,
    metadata: body.metadata ?? {},
  };

  const pageResult = await admin
    .from("analytics_page_views")
    .upsert(pagePatch, { onConflict: "id" });
  if (pageResult.error) {
    console.warn("[analytics] page_view upsert failed:", pageResult.error.message);
    return NextResponse.json({ ok: true, skipped: "page_view" });
  }

  const eventResult = await admin.from("analytics_events").insert({
    session_id: body.sessionId,
    page_view_id: body.pageViewId,
    visitor_id: body.visitorId,
    user_id: user?.id ?? null,
    event_type: eventType,
    path: body.path,
    value: durationSec,
    metadata: {
      scrollMaxPct,
      readComplete: !!body.readComplete,
      ...(body.metadata ?? {}),
    },
  });
  if (eventResult.error) console.warn("[analytics] event insert failed:", eventResult.error.message);

  if (user?.id) {
    const profileResult = await admin
      .from("profiles")
      .update({ last_active_at: now })
      .eq("id", user.id);
    if (profileResult.error) console.warn("[analytics] last_active_at update failed:", profileResult.error.message);
  }

  return NextResponse.json({ ok: true });
}
