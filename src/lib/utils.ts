import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 階段顏色
export const STAGE_COLORS: Record<number, { from: string; to: string; name: string; emoji: string }> = {
  1: { from: "#50fa7b", to: "#8be9fd", name: "基礎之地", emoji: "🏛️" },
  2: { from: "#8be9fd", to: "#bd93f9", name: "互動王國", emoji: "🏰" },
  3: { from: "#bd93f9", to: "#ff79c6", name: "後端深淵", emoji: "⚙️" },
  4: { from: "#ff79c6", to: "#ffb86c", name: "多語大陸", emoji: "🌍" },
  5: { from: "#ffb86c", to: "#ffd700", name: "商業港口", emoji: "💼" },
  6: { from: "#ffd700", to: "#50fa7b", name: "AI 紀元", emoji: "🤖" },
  7: { from: "#a78bfa", to: "#c4b5fd", name: "速查附錄", emoji: "📖" },
};

export const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: "初級",
  intermediate: "中級",
  advanced: "進階",
  reference: "速查",
};

export const TIP_LABELS: Record<string, { icon: string; label: string }> = {
  practical: { icon: "💡", label: "新手必知" },
  warning: { icon: "⚠️", label: "新手常見錯誤" },
  pro: { icon: "🎯", label: "面試常考" },
  security: { icon: "🚨", label: "資安警報" },
  business: { icon: "💼", label: "接案小知識" },
  performance: { icon: "⚡", label: "效能心法" },
  milestone: { icon: "🎉", label: "里程碑" },
  trend: { icon: "🚀", label: "2026 趨勢" },
};
