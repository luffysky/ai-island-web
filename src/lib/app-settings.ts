/**
 * app_settings 讀寫 helper
 * - 30 秒 in-memory cache（avoid 每 request 都打 DB）
 * - 管理員透過 /admin/settings 改、影響全站行為
 */
import { createSupabaseAdmin } from "./supabase-admin";

let cache: { at: number; data: Map<string, any> } | null = null;

async function loadAll(): Promise<Map<string, any>> {
  if (cache && Date.now() - cache.at < 30_000) return cache.data;
  try {
    const admin = createSupabaseAdmin();
    const { data } = await admin.from("app_settings").select("key, value");
    const map = new Map<string, any>();
    for (const r of (data as any[]) ?? []) map.set(r.key, r.value);
    cache = { at: Date.now(), data: map };
    return map;
  } catch {
    return new Map();
  }
}

export async function getAppSetting<T = any>(key: string, fallback: T): Promise<T> {
  const map = await loadAll();
  if (!map.has(key)) return fallback;
  return map.get(key) as T;
}

export function invalidateAppSettings() {
  cache = null;
}

// 把 JSON true / "true" / { enabled: true } 都當開
function truthyFlag(v: any): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true";
  if (v && typeof v === "object" && "enabled" in v) return !!v.enabled;
  return false;
}

// 常用 flag 捷徑
export async function isIslandEnabled(): Promise<boolean> {
  const map = await loadAll();
  // 後台開關鍵 = feature_island_enabled；舊鍵 island_enabled 當 legacy fallback
  const raw = map.has("feature_island_enabled") ? map.get("feature_island_enabled") : map.get("island_enabled");
  return truthyFlag(raw);
}

/** 功能總開關：讀 feature_<name>_enabled（預設開、缺鍵也視為開、避免誤關）。 */
export async function isFeatureEnabled(name: "blog" | "forum" | "pet" | "island"): Promise<boolean> {
  if (name === "island") return isIslandEnabled();
  const map = await loadAll();
  const key = `feature_${name}_enabled`;
  if (!map.has(key)) return true; // 沒設過 = 預設開
  return truthyFlag(map.get(key));
}

/** 開放註冊？signup_enabled 預設開。 */
export async function isSignupEnabled(): Promise<boolean> {
  const map = await loadAll();
  if (!map.has("signup_enabled")) return true;
  return truthyFlag(map.get("signup_enabled"));
}
