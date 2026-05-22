import { getChapter } from "@/lib/content";
import { notFound } from "next/navigation";
import { ChapterView } from "@/components/chapter/ChapterView";
import { mergeSeoForPath } from "@/lib/seo-render";
import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";

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

  const title = `Ch${String(chapter.id).padStart(2, "0")}：${chapter.title} | AI 島`;
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

  // JSON-LD Schema.org Course
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: chapter.title,
    description: chapter.description || chapter.subtitle,
    provider: {
      "@type": "Organization",
      name: "AI 島",
      url: SITE_URL,
    },
    educationalLevel: chapter.difficulty,
    timeRequired: `PT${chapter.estimatedHours ?? 1}H`,
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      inLanguage: "zh-TW",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ChapterView chapter={chapter} />
    </>
  );
}

export async function generateStaticParams() {
  return Array.from({ length: 70 }, (_, i) => ({ id: String(i + 1) }));
}
