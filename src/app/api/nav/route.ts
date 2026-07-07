import { NextResponse } from "next/server";
import { getLocale } from "next-intl/server";
import { getNavChapters, invalidateContentCache } from "@/lib/content";
import { localizeChapterMetas } from "@/lib/content-i18n";

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
  const locale = await getLocale();
  // 章標題/副標接內容翻譯（有譯文才覆蓋、無則中文）；lesson 標題暫不翻（量大、成本）
  const chapters = await localizeChapterMetas(await getNavChapters() as any[], locale);

  const nav = chapters.map((c: any) => ({
    id: c.id,
    title: c.title,
    subtitle: c.subtitle,
    stage: c.stage,
    icon: c.icon,
    difficulty: c.difficulty,
    lessons: (c.lessons ?? []).map((l: any) => ({
      id: l.id,
      number: l.number,
      title: l.title,
      outline: l.outline ?? [],
    })),
  }));

  return NextResponse.json({ chapters: nav }, {
    headers: {
      // 內容會隨語言 cookie 變 → 用 private（只給該使用者瀏覽器快取、不進共用 CDN、避免跨語言汙染）
      // DB 仍有保護：getNavChapters in-memory cache + localizeChapterMetas 走 Data Cache
      "Cache-Control": "private, max-age=30",
    },
  });
}
