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
  district?: string | null;
  metadata?: Record<string, unknown>;
};

function clampInt(value: unknown, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.round(n)));
}

// IP geo memory cache（同 IP 24 小時不重複 API lookup、防 ipwho.is rate limit）
const geoCache = new Map<string, { country: string | null; region: string | null; city: string | null; ts: number }>();
const GEO_TTL = 24 * 3600 * 1000;
const GEO_CACHE_MAX = 5000;

function getClientIp(req: NextRequest): string | null {
  // Zeabur / Cloudflare 都用 X-Forwarded-For 傳 client IP
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip");
}

async function lookupCityByIp(ip: string): Promise<{ country: string | null; region: string | null; city: string | null } | null> {
  // ipwho.is 免費、不需 key、https 也支援。Rate limit: 10k/月免費
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(`https://ipwho.is/${ip}?fields=success,country_code,city,region`, {
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.success) return null;
    return {
      country: data.country_code ?? null,
      region: data.region ?? null,
      city: data.city ?? null,
    };
  } catch {
    return null;
  }
}

async function geo(req: NextRequest): Promise<{ country: string | null; region: string | null; city: string | null }> {
  // 1. 優先用 edge platform headers（Vercel / Cloudflare 直連、最快、最準）
  const headerCountry = req.headers.get("x-vercel-ip-country") || req.headers.get("cf-ipcountry");
  const headerRegion = req.headers.get("x-vercel-ip-country-region") || req.headers.get("cf-region");
  const headerCity = req.headers.get("x-vercel-ip-city") || req.headers.get("cf-ipcity");

  // headers 有 city = Vercel / CF Enterprise、直接用
  if (headerCity) return { country: headerCountry, region: headerRegion, city: headerCity };

  // 2. headers 只有 country（Zeabur 預設 / CF free）→ 用 IP lookup API 補 city
  const ip = getClientIp(req);
  if (!ip || ip === "127.0.0.1" || ip.startsWith("::1")) {
    return { country: headerCountry, region: headerRegion, city: null };
  }

  // memory cache 命中（同 IP 24h 不重複 lookup）
  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.ts < GEO_TTL) {
    return { country: cached.country ?? headerCountry, region: cached.region ?? headerRegion, city: cached.city };
  }

  // 真打 lookup
  const fresh = await lookupCityByIp(ip);
  if (fresh) {
    // LRU 簡單上限（超過 evict 最舊的）
    if (geoCache.size >= GEO_CACHE_MAX) {
      const firstKey = geoCache.keys().next().value;
      if (firstKey !== undefined) geoCache.delete(firstKey);
    }
    geoCache.set(ip, { ...fresh, ts: Date.now() });
    return {
      country: fresh.country ?? headerCountry,
      region: fresh.region ?? headerRegion,
      city: fresh.city,
    };
  }
  // API 失敗、cache 空結果防短期重打
  geoCache.set(ip, { country: headerCountry, region: headerRegion, city: null, ts: Date.now() });
  return { country: headerCountry, region: headerRegion, city: null };
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
  const location = await geo(req);
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
    district: body.district ?? null,
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
    district: body.district ?? null,
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
