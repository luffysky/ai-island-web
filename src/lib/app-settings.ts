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

// 常用 flag 捷徑
export async function isIslandEnabled(): Promise<boolean> {
  const v = await getAppSetting<any>("island_enabled", false);
  // 兼容 JSON true / "true" / { enabled: true }
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true";
  if (v && typeof v === "object" && "enabled" in v) return !!v.enabled;
  return false;
}
