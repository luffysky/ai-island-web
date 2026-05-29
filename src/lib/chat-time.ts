/**
 * 統一聊天訊息時間格式化
 *
 * 林董要求：所有 AI 對話訊息旁要顯示「15:03」+ 日期、台灣時間
 *
 * 規則：
 *   - 今天的訊息 → 只顯示時間「15:03」
 *   - 7 天內 → 「03/15 15:03」
 *   - 更久 → 「2026/03/15 15:03」
 */
const TZ = "Asia/Taipei";

export function formatChatTime(input: string | number | Date): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "";

  const now = new Date();
  const sameDay =
    d.toLocaleDateString("zh-TW", { timeZone: TZ }) ===
    now.toLocaleDateString("zh-TW", { timeZone: TZ });

  const time = d.toLocaleTimeString("zh-TW", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  if (sameDay) return time;

  const days = Math.floor((now.getTime() - d.getTime()) / 86400_000);
  if (days < 7) {
    const md = d.toLocaleDateString("zh-TW", { timeZone: TZ, month: "2-digit", day: "2-digit" });
    return `${md} ${time}`;
  }
  return d.toLocaleString("zh-TW", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
}
