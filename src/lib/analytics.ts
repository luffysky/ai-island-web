/**
 * GA4 自訂事件薄包裝（client 用）。SSR / gtag 未載入時安靜略過、不報錯。
 *
 * 用法：
 *   import { trackEvent, setAnalyticsUser } from "@/lib/analytics";
 *   trackEvent("ai_chat_send", { persona: "green", model: "auto" });
 *   setAnalyticsUser(user.id, { role: "member", level: 3, plan: "free" });
 *
 * 事件命名規則（GA4 建議 snake_case、動詞_名詞）：
 *   轉換：sign_up / login / line_bind / subscribe / purchase
 *   學習：lesson_start / lesson_complete / quiz_complete / chapter_complete
 *   互動：ai_chat_send / ai_feedback / note_save / checkin / pet_chat / share_answer
 */

type GtagParams = Record<string, string | number | boolean | undefined>;

export function trackEvent(name: string, params?: GtagParams): void {
  if (typeof window === "undefined") return;
  const g = (window as any).gtag;
  if (typeof g !== "function") return;
  try { g("event", name, params ?? {}); } catch {}
}

/** 登入後呼叫一次：綁 user_id（跨裝置）+ 設使用者屬性（受眾分群用：role / level / plan…） */
export function setAnalyticsUser(userId: string | null, props?: GtagParams): void {
  if (typeof window === "undefined") return;
  const g = (window as any).gtag;
  if (typeof g !== "function") return;
  try {
    const id = process.env.NEXT_PUBLIC_GA_ID;
    if (id) g("config", id, { user_id: userId || undefined });
    if (props && Object.keys(props).length) g("set", "user_properties", props);
  } catch {}
}
