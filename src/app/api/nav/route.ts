import { NextResponse } from "next/server";
import { getAllChapters, invalidateContentCache } from "@/lib/content";

// force-dynamic + 短 cache：避免 server in-memory cache 卡住 ch72/73/74 lesson 數對不上 DB 的問題
// （之前 revalidate=60 + Cache-Control=60、但 production 上某些章節 lesson 數一直拿到舊值、林董手機看到 3/2/1 而 DB 是 5/5/4）
export const dynamic = "force-dynamic";
export const revalidate = 30;

/**
 * Side navigation API - 給左側欄用、只回傳必要資料
 * 不含 content（太大）、只含 lesson 的 id / number / title / outline
 *
 * 支援 ?refresh=1 強制清 server in-memory cache。
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("refresh") === "1") {
    invalidateContentCache();
  }
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
      // 短 cache、edge 30s（CDN 還是吃一點、避免每個 client 都打 DB）
      "Cache-Control": "public, max-age=30, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
