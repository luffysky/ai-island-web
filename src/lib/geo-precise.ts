/**
 * 精準位置（區級）解析器。
 *
 * 使用瀏覽器 navigator.geolocation 取座標 → Nominatim 反向 geocode
 * 換出區（suburb / city_district）。
 *
 * 限制 / 設計：
 *   - opt-in：必須先 setOptIn(true)。否則任何呼叫直接回 null。
 *   - 每個 session 只查一次（sessionStorage 暫存）、避免 Nominatim 1 req/s 限制
 *   - geolocation 用 maximumAge=5 分鐘、避免每次都喚醒 GPS
 *   - Nominatim 沒回應 / 失敗 → 回 null、不阻塞 tracker
 */

export type PreciseGeo = {
  lat: number;
  lng: number;
  district: string | null;
  city?: string | null;
  region?: string | null;
};

const SESSION_CACHE_KEY = "precise-geo-cache";
const OPT_IN_KEY = "precise-geo-opt-in";

export function hasPreciseOptIn(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(OPT_IN_KEY) === "1";
  } catch {
    return false;
  }
}

export function setPreciseOptIn(value: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (value) localStorage.setItem(OPT_IN_KEY, "1");
    else {
      localStorage.removeItem(OPT_IN_KEY);
      sessionStorage.removeItem(SESSION_CACHE_KEY);
    }
  } catch {}
}

export async function getPreciseLocation(): Promise<PreciseGeo | null> {
  if (typeof window === "undefined") return null;
  if (!hasPreciseOptIn()) return null;

  try {
    const cached = sessionStorage.getItem(SESSION_CACHE_KEY);
    if (cached) return JSON.parse(cached) as PreciseGeo;
  } catch {}

  if (!("geolocation" in navigator)) return null;

  const pos = await new Promise<GeolocationPosition | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p),
      () => resolve(null),
      { timeout: 8000, maximumAge: 5 * 60_000 },
    );
  });
  if (!pos) return null;

  const { latitude, longitude } = pos.coords;
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=zh-TW&zoom=14`,
      { headers: { Accept: "application/json" } },
    );
    if (!r.ok) return null;
    const data = await r.json();
    const a = data.address ?? {};
    const district =
      a.suburb ||
      a.city_district ||
      a.district ||
      a.neighbourhood ||
      a.town ||
      null;
    const result: PreciseGeo = {
      lat: latitude,
      lng: longitude,
      district,
      city: a.city || a.county || null,
      region: a.state || a.region || null,
    };
    try {
      sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(result));
    } catch {}
    return result;
  } catch {
    return null;
  }
}
