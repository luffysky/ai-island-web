import { NextResponse } from "next/server";
import { getAllChapters } from "@/lib/content";

export const revalidate = 60;

/**
 * Side navigation API - 給左側欄用、只回傳必要資料
 * 不含 content（太大）、只含 lesson 的 id / number / title / outline
 *
 * Cache 策略：跟 chapter detail page 對齊（revalidate 60 秒）、
 * 改完 chapter 跑 import_chapters_to_db.mjs 後最多 60 秒手機導覽列就更新。
 * （之前是 1 小時 ISR + 24 小時 CDN cache、改完 chapter 要等大半天才更新、林董有抱怨）
 */
export async function GET() {
  const chapters = await getAllChapters();

  const nav = chapters.map((c) => ({
    id: c.id,
    title: c.title,
    subtitle: c.subtitle,
    stage: c.stage,
    icon: c.icon,
    difficulty: c.difficulty,
    lessons: (c.lessons ?? []).map((l) => ({
      id: l.id,
      number: l.number,
      title: l.title,
      outline: l.outline ?? [],
    })),
  }));

  return NextResponse.json({ chapters: nav }, {
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=60",
    },
  });
}
