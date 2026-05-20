"use client";
import { usePathname } from "next/navigation";
import { AITutorWidget } from "./AITutorWidget";

export function AITutorAutoContext() {
  const pathname = usePathname();

  // 從 URL 偵測 chapter id：/chapters/12 → 12
  let chapterId: number | undefined;
  const chapterMatch = pathname?.match(/\/chapters\/(\d+)/);
  if (chapterMatch) {
    chapterId = Number(chapterMatch[1]);
  }

  // /me/notes 等不要顯示 AI（避免干擾）
  if (pathname?.startsWith("/admin") || pathname?.includes("/gate")) {
    return null;
  }

  return <AITutorWidget contextChapterId={chapterId} />;
}
