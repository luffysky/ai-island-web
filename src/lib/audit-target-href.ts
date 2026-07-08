import { adminHref } from "@/lib/admin-href";

/**
 * 由 audit log 的 (target_type, target_id) 算出「點進去看該實體」的網址。
 * 找不到對應就回 null（維持純文字）。target_type 字串來自各處 writeAudit、用寬鬆比對。
 * 「整個專案跟操作記錄有關都要可以點進去」——這裡集中管理對應，之後新目標型別補一條即可。
 */
export function auditTargetHref(targetType?: string | null, targetId?: string | null): string | null {
  if (!targetType || !targetId) return null;
  const t = targetType.toLowerCase();

  // 使用者 / 個人檔案 → 後台使用者詳情
  if (/(^|_)(user|profile|member|account)s?$/.test(t) || t.includes("user") || t.includes("profile")) {
    return adminHref(`/admin/users/${targetId}`);
  }
  // 論壇主題 / 回覆 → 主題頁（回覆也導到所在主題）
  if (t.includes("thread")) return `/forum/thread/${targetId}`;
  // 章節 → 章節頁
  if (t.includes("chapter")) return `/chapters/${targetId}`;
  // 創作者作品 → 公開作品頁
  if (t.includes("work")) return `/works/${targetId}`;
  // 訂單 / 金流 → 後台訂單
  if (t.includes("order")) return adminHref(`/admin/orders`);
  // 兌換 / Z 幣 → 後台 Z 幣
  if (t.includes("zcoin") || t.includes("coin") || t.includes("redeem")) return adminHref(`/admin/zcoin`);
  // 檢舉 / 審核 → 後台檢舉
  if (t.includes("report") || t.includes("moderation")) return adminHref(`/admin/reports`);
  // 功能旗標 → 後台旗標
  if (t.includes("flag") || t.includes("setting")) return adminHref(`/admin/settings`);

  return null;
}
