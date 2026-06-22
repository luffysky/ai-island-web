// XP / Z幣 流水的「人話」標籤：把 reason code + meta 變成看得懂的明細。
// 用在 admin 使用者頁 + 使用者自己的「Z幣/經驗明細」頁。

const REASON_MAP: Record<string, string> = {
  lesson_complete: "完成課程",
  daily_quiz: "每日測驗",
  quiz_perfect: "測驗全對 🎯",
  quiz_pass: "測驗通過",
  chapter_end_quiz: "章末測驗",
  streak_bonus: "連續學習獎勵 🔥",
  daily_checkin: "每日簽到 ✅",
  checkin: "每日簽到 ✅",
  continuation: "簽到延續",
  admin_batch_grant_xp: "管理員發放 XP",
  admin_batch_grant: "管理員發放",
  welcome: "新手歡迎禮 🎉",
  referral: "推薦好友獎勵 🎁",
  unlock_chapter: "解鎖章節",
  achievement: "解鎖成就 🏆",
};

const PREFIX_MAP: Record<string, string> = {
  admin_grant: "管理員發放",
  airdrop: "空投獎勵 🎁",
  nami_challenge: "Nami 挑戰",
  pet_quest: "寵物任務 🐾",
  island_fish: "島嶼釣魚 🎣",
  island_harvest: "島嶼採集 🌾",
  line_admin_grant: "LINE 簽到獎勵 ✅",
  referral: "推薦好友 🎁",
};

/** reason code (+ meta) → 看得懂的中文明細。已是中文整句的（推薦/通知類）直接顯示。 */
export function ledgerLabel(reason: string | null | undefined, meta?: any): string {
  if (!reason) return "—";
  // 已是中文整句（如推薦理由）→ 原樣
  if (/[一-鿿]/.test(reason) && reason.length > 6) return reason;

  const fixed = REASON_MAP[reason];
  if (fixed) {
    const s = fixed;
    const extra: string[] = [];
    if (meta?.chapter != null) extra.push(`Ch${meta.chapter}`);
    if (meta?.lesson_id) extra.push(`L${meta.lesson_id}`);
    if (meta?.correct != null && meta?.total != null) extra.push(`${meta.correct}/${meta.total} 題`);
    if (meta?.streak != null) extra.push(`連 ${meta.streak} 天`);
    if (meta?.title) extra.push(String(meta.title).slice(0, 24));
    return extra.length ? `${s}（${extra.join("·")}）` : s;
  }

  // prefix:detail 形式
  const idx = reason.indexOf(":");
  if (idx > 0) {
    const prefix = reason.slice(0, idx);
    const detail = reason.slice(idx + 1);
    if (PREFIX_MAP[prefix]) {
      return PREFIX_MAP[prefix] + (detail ? `：${detail.slice(0, 40)}` : "");
    }
  }
  return reason; // 不認得 → 原樣（仍看得到 code）
}
