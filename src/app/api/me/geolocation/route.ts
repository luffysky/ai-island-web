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
async function reverseGeo(lat: number, lng: number): Promise<{ city?: string; country?: string }> {
  try {
    // 用 IPinfo 反向（其實該用 Google Maps Geocoding、但 IPinfo 不支援；先簡單存原值）
    // 若有 GOOGLE_MAPS_API_KEY env 才反查
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) return {};
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}&language=zh-TW`;
    const r = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!r.ok) return {};
    const d = await r.json() as any;
    const comps = d.results?.[0]?.address_components ?? [];
    const country = comps.find((c: any) => c.types?.includes("country"))?.long_name;
    const city = comps.find((c: any) => c.types?.includes("administrative_area_level_1"))?.long_name;
    return { country, city };
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
  const { city, country } = await reverseGeo(lat, lng);

  // 只存大致縣市 + 同意時間（隱私承諾、不存 lat/lng）
  try {
    await admin.from("profiles").update({
      geo_city: city ?? null,
      geo_country: country ?? null,
      geo_consent_at: new Date().toISOString(),
      geo_revoked_at: null,
    } as any).eq("id", user.id);
  } catch (e) {
    return NextResponse.json({ error: "save_failed", message: (e as any)?.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, city, country });
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
