import type { Metadata } from "next";
import { DUNGEONS } from "@/data/dungeons";
import { SITE_STATS } from "@/lib/site-stats";
import { CoursesClient } from "./CoursesClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";

export const metadata: Metadata = {
  title: "AI 任務副本 | AI 島",
  description: "5 大 AI 實戰副本：文案、圖像、影片、自動化、程式。打敗 boss、掌握 AI 應用力。",
  alternates: { canonical: `${SITE_URL}/courses` },
  openGraph: {
    title: "AI 任務副本 — 5 大實戰副本",
    description: "文案 / 圖像 / 影片 / 自動化 / 程式、選一個副本開始挑戰。",
    url: `${SITE_URL}/courses`,
    images: [`${SITE_URL}/api/og?title=AI 任務副本&subtitle=5 大實戰副本`],
  },
};

export default function CoursesPage() {
  return <CoursesClient dungeons={DUNGEONS} chapterCount={SITE_STATS.chapterCount} />;
}
