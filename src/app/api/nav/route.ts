import { NextResponse } from "next/server";
import { getAllChapters } from "@/lib/content";

export const dynamic = "force-static";
export const revalidate = 3600;

/**
 * Side navigation API - 給左側欄用、只回傳必要資料
 * 不含 content（太大）、只含 lesson 的 id / number / title / outline
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
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
