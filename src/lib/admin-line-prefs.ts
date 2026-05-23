/**
 * 多 admin LINE 偏好管理
 * 每個 admin 可選自己要收哪些 kind
 * 預設都收、明確 disabled 才不收
 */
import { createSupabaseAdmin } from "./supabase-admin";

export const ALL_KINDS = [
  "visit", "leave", "login", "user_login", "admin_login",
  "lesson_complete", "achievement", "level_up", "forum_reply",
  "order", "error", "fatal", "cron_daily", "cron_weekly",
] as const;
export type NotifKindEnum = typeof ALL_KINDS[number];

const KIND_LABEL: Record<string, string> = {
  visit: "👀 訪客",
  leave: "🚪 離開",
  login: "🔑 登入",
  user_login: "🔑 用戶登入",
  admin_login: "👑 admin 登入",
  lesson_complete: "✅ 完成 lesson",
  achievement: "🏆 成就",
  level_up: "🎉 升等",
  forum_reply: "💭 論壇回覆",
  order: "💰 訂單",
  error: "🛡️ 錯誤",
  fatal: "🚨 致命錯誤",
  cron_daily: "📊 每日報表",
  cron_weekly: "📊 每週報表",
};

export function kindLabel(kind: string): string {
  return KIND_LABEL[kind] ?? kind;
}

// 5 秒快取（避免每次推都打 DB）
let cache: { at: number; data: Map<string, Set<string>> } | null = null;

async function loadAllDisabled(): Promise<Map<string, Set<string>>> {
  if (cache && Date.now() - cache.at < 5000) return cache.data;
  try {
    const admin = createSupabaseAdmin();
    const { data } = await admin
      .from("admin_line_prefs")
      .select("line_user_id, kind, enabled")
      .eq("enabled", false);
    const map = new Map<string, Set<string>>();
    for (const r of (data as any[]) ?? []) {
      if (!map.has(r.line_user_id)) map.set(r.line_user_id, new Set());
      map.get(r.line_user_id)!.add(r.kind);
    }
    cache = { at: Date.now(), data: map };
    return map;
  } catch {
    return new Map();
  }
}

/** 給 notify-admin 用：判斷 user 是否該收這個 kind */
export async function shouldUserReceive(lineUserId: string, kind: string): Promise<boolean> {
  const disabledMap = await loadAllDisabled();
  return !(disabledMap.get(lineUserId)?.has(kind));
}

/** 取得 user 目前偏好（給 /prefs 命令用） */
export async function getUserPrefs(lineUserId: string): Promise<Record<string, boolean>> {
  const disabled = (await loadAllDisabled()).get(lineUserId) ?? new Set();
  const out: Record<string, boolean> = {};
  for (const k of ALL_KINDS) out[k] = !disabled.has(k);
  return out;
}

/** 設定某個 kind 開/關 */
export async function setUserPref(lineUserId: string, kind: string, enabled: boolean): Promise<void> {
  try {
    const admin = createSupabaseAdmin();
    await admin.from("admin_line_prefs").upsert({
      line_user_id: lineUserId,
      kind,
      enabled,
      updated_at: new Date().toISOString(),
    });
    cache = null; // 失效快取
  } catch (e) {
    console.warn("[admin-line-prefs] setUserPref failed:", (e as any)?.message);
  }
}
