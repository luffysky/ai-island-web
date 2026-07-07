import { getChapter, getAllChapters } from "@/lib/content";
import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { hasEarlyAccess } from "@/lib/store-redeem";
import { ChapterView } from "@/components/chapter/ChapterView";
import { ChapterResources } from "@/components/chapter/ChapterResources";
import { AiSummaryBlock } from "@/components/chapter/AiSummaryBlock";
import { RelatedChapters } from "@/components/chapter/RelatedChapters";
import { mergeSeoForPath } from "@/lib/seo-render";
import {
  courseSchema, breadcrumbSchema, faqSchema, itemListSchema,
  withAuthorAndReviewer, jsonLdScript,
} from "@/lib/seo-jsonld";
import { chapterDisplayNumberById } from "@/lib/chapter-display";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const chapter = await getChapter(Number(id));

  if (!chapter) {
    return {
      title: "找不到此章節 | AI 島",
    };
  }

  const title = `Ch${chapterDisplayNumberById(chapter.id)}：${chapter.title} | AI 島`;
  const desc = chapter.description || chapter.subtitle || `學習 ${chapter.title}、${chapter.lessons?.length ?? 0} 個 lesson、含實戰練習。`;
  const url = `${SITE_URL}/chapters/${chapter.id}`;
  const ogImage = `${SITE_URL}/api/og/chapter/${chapter.id}`;

  const fallback: Metadata = {
    title,
    description: desc,
    keywords: [
      chapter.title,
      "AI 島",
      "全端養成",
      "線上學習",
      ...(chapter.outcomes?.slice(0, 3) ?? []),
    ],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description: desc,
      url,
      siteName: "AI 島",
      type: "article",
      locale: "zh_TW",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: chapter.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [ogImage],
    },
  };

  // 後台 seo_pages 對 /chapters/<id> 有 override 就以 override 蓋掉
  // 對應欄位（title/description/og/canonical/keywords），placeholder 也會替換。
  return mergeSeoForPath(`/chapters/${chapter.id}`, fallback);
}

export default async function ChapterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chapter = await getChapter(Number(id));
  if (!chapter) notFound();

  // #89 未發布章節 gating：需商店「章節搶先」才可提前看（目前全部已發布、此為排程章節預留、零影響）
  if (chapter.status && chapter.status !== "published") {
    const sb = await createSupabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    const allowed = user ? await hasEarlyAccess(user.id) : false;
    if (!allowed) {
      const t = await getTranslations("chapters");
      return (
        <main className="max-w-lg mx-auto px-4 py-24 text-center space-y-4">
          <div className="text-5xl">🔒</div>
          <h1 className="text-xl font-bold">{t("notPublishedTitle")}</h1>
          <p className="text-sm text-fg-muted">{t("notPublishedDesc")}</p>
          <a href="/store?tab=redeem" className="inline-block px-5 py-2.5 rounded-full bg-accent text-white font-semibold">{t("unlock")}</a>
        </main>
      );
    }
  }

  // JSON-LD：Course (含 author+reviewer) + Breadcrumb + ItemList(lessons) + FAQ
  const chapterUrl = `${SITE_URL}/chapters/${chapter.id}`;
  const ld = [
    withAuthorAndReviewer(courseSchema({
      name: `Ch${chapterDisplayNumberById(chapter.id)}：${chapter.title}`,
      description: chapter.description || chapter.subtitle || chapter.title,
      url: chapterUrl,
      lessons: chapter.lessons?.length,
      difficulty: chapter.difficulty,
      updatedAt: (chapter as any).updated_at,
    })),
    breadcrumbSchema([
      { name: "首頁", url: SITE_URL },
      { name: "章節", url: `${SITE_URL}/chapters` },
      { name: chapter.title, url: chapterUrl },
    ]),
    itemListSchema(
      (chapter.lessons ?? []).slice(0, 30).map((l: any) => ({
        name: l.title,
        url: `${chapterUrl}#${l.id}`,
      }))
    ),
    faqSchema(chapter.faq ?? []),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(ld)}
      />
      <AiSummaryBlock chapter={chapter} />
      <ChapterView chapter={chapter} />
      <ChapterResources chapterId={chapter.id} />
      <RelatedChapters chapter={chapter} />
    </>
  );
}

// 不在 build time 預生 75 章靜態頁（Zeabur 每個 chapter SSG > 60s 會超時 build 失敗）
// 改成 on-demand ISR：first request 才 render、之後 60s（revalidate）內走快取
// 配合 export const revalidate = 60、Next.js 自動處理
// SEO 不受影響、Google bot 第 1 次爬時會 trigger SSG + cache
