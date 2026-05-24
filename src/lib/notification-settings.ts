import { createSupabaseAdmin } from "./supabase-admin";

export type NotificationChannel = "in_app" | "email" | "line" | "push";

export type NotificationSetting = {
  event_key: string;
  label_zh: string;
  description: string | null;
  category: string | null;
  channels: Record<NotificationChannel, boolean>;
  enabled: boolean;
  is_v1: boolean;
};

/**
 * 跑時候 admin / 觸發點問：這個事件、這個 channel 該不該送？
 * 若表查不到 / migration 沒跑、預設 true（向後相容）。
 */
let cache: Map<string, NotificationSetting> | null = null;
let cacheAt = 0;
const CACHE_TTL = 60_000; // 60s

async function loadSettings() {
  if (cache && Date.now() - cacheAt < CACHE_TTL) return cache;
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("notification_settings").select("*");
  cache = new Map();
  for (const r of (data as any[]) ?? []) {
    cache.set(r.event_key, r);
  }
  cacheAt = Date.now();
  return cache;
}

export async function isChannelEnabled(eventKey: string, channel: NotificationChannel): Promise<boolean> {
  try {
    const settings = await loadSettings();
    const s = settings.get(eventKey);
    if (!s) return true; // 未設定 = 預設開（避免擋掉新事件）
    if (!s.enabled) return false;
    return !!s.channels?.[channel];
  } catch {
    return true; // 表還沒建、不擋
  }
}

export function clearNotificationSettingsCache() {
  cache = null;
  cacheAt = 0;
}
