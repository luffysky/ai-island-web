/**
 * 估計閱讀時間（分鐘）— 中英混合。
 * 中文 350 字/分、英文 220 字/分、code-block 慢一半。
 */
export function estimateReadingTime(markdown: string): number {
  if (!markdown) return 0;

  // 抓 code block、之後算字數時排除
  const codeBlocks = markdown.match(/```[\s\S]*?```/g) ?? [];
  const codeChars = codeBlocks.join("").length;
  const textOnly = markdown.replace(/```[\s\S]*?```/g, "");

  const chineseChars = (textOnly.match(/[一-龥]/g) ?? []).length;
  const englishWords = (textOnly.replace(/[一-龥]/g, "").match(/\b\w+\b/g) ?? []).length;

  const minutes =
    chineseChars / 350 +
    englishWords / 220 +
    codeChars / 600;

  return Math.max(1, Math.round(minutes));
}

export function formatReadingTime(minutes: number): string {
  if (minutes < 1) return "< 1 分鐘";
  if (minutes < 60) return `${minutes} 分鐘`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} 小時 ${m} 分` : `${h} 小時`;
}
