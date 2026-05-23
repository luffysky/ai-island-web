import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

/**
 * 儲存 / 撤回用戶精準位置（同意後）
 * - 只存「大致縣市」、不存原始 lat/lng（隱私承諾）
 * - lat/lng 用 ipinfo 反查 city、存 profile.geo_city + geo_country
 * - 也記 consent_at / revoked_at
 */
async function reverseGeo(lat: number, lng: number): Promise<{ city?: string; country?: string; district?: string }> {
  // 優先用 Google Maps（如有 API key）
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (key) {
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}&language=zh-TW`;
      const r = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (r.ok) {
        const d = await r.json() as any;
        const comps = d.results?.[0]?.address_components ?? [];
        const country = comps.find((c: any) => c.types?.includes("country"))?.long_name;
        const city = comps.find((c: any) => c.types?.includes("administrative_area_level_1"))?.long_name;
        const district = comps.find((c: any) => c.types?.includes("administrative_area_level_3"))?.long_name;
        return { country, city, district };
      }
    } catch {}
  }
  // Fallback：OpenStreetMap Nominatim（免費、不需 key、有 rate limit 1 req/s）
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=zh-TW&zoom=12`;
    const r = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "ai-island/1.0 (snowrealm.pet)" },
    });
    if (!r.ok) return {};
    const d = await r.json() as any;
    const a = d.address ?? {};
    return {
      country: a.country,
      city: a.state ?? a.city ?? a.county ?? a.region,
      district: a.suburb ?? a.city_district ?? a.town ?? a.village,
    };
  } catch { return {}; }
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({} as any));
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return NextResponse.json({ error: "invalid_coords" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const { city, country, district } = await reverseGeo(lat, lng);
  // 存到「縣市 + 區」（例：新北市 板橋區）
  const fullCity = [city, district].filter(Boolean).join(" ");

  try {
    await admin.from("profiles").update({
      geo_city: fullCity || null,
      geo_country: country ?? null,
      geo_consent_at: new Date().toISOString(),
      geo_revoked_at: null,
    } as any).eq("id", user.id);
  } catch (e) {
    return NextResponse.json({ error: "save_failed", message: (e as any)?.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, city: fullCity, country, district });
}

export async function DELETE() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createSupabaseAdmin();
  try {
    await admin.from("profiles").update({
      geo_city: null,
      geo_country: null,
      geo_revoked_at: new Date().toISOString(),
    } as any).eq("id", user.id);
  } catch {}
  return NextResponse.json({ ok: true });
}
