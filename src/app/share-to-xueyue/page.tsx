import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * PWA share_target 接收頁
 * 用戶從其他 app（Twitter / LINE / Chrome）分享文字 / URL 進來
 * 把分享的內容自動帶進 AI 導師 widget 開啟對話
 */
export default async function ShareToXueyuePage({ searchParams }: { searchParams: Promise<{ title?: string; text?: string; url?: string }> }) {
  const sp = await searchParams;
  const parts: string[] = [];
  if (sp.title) parts.push(sp.title);
  if (sp.text) parts.push(sp.text);
  if (sp.url) parts.push(sp.url);
  const combined = parts.join("\n").slice(0, 1000).trim();

  if (!combined) redirect("/");
  // 用 query string 帶到 widget 自動開啟
  redirect(`/?ai-prompt=${encodeURIComponent(combined)}`);
}
