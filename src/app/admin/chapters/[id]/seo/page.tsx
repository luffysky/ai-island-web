import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { notFound } from "next/navigation";
import { chapters } from "@/data/chapters";
import { SeoPreviewClient } from "./SeoPreviewClient";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aiisland.tw";

export default async function ChapterSeoPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  const chapter = chapters.find((c) => c.id === id);
  if (!chapter) notFound();

  const admin = createSupabaseAdmin();
  const { data: override } = await admin
    .from("seo_overrides")
    .select("*")
    .eq("path", `/chapters/${id}`)
    .maybeSingle();

  const defaults = {
    title: `${chapter.title} | AI 島`,
    description: chapter.description ?? `${chapter.title} — ${chapter.subtitle}`,
    og_image: `${SITE_URL}/api/og/chapter/${id}`,
  };

  return (
    <div>
      <PageHero
        emoji="🔍"
        title={`SEO 預覽 · Ch${String(id).padStart(2, "0")}`}
        desc="模擬 Google search snippet + Open Graph 預覽。可即時編輯 override、不用改 code。"
        gradient="from-green-500/10 via-emerald-500/10 to-teal-500/10"
        borderColor="border-green-500/30"
      />

      <SeoPreviewClient
        chapterId={id}
        chapterTitle={chapter.title}
        defaults={defaults}
        override={(override ?? {}) as any}
        siteUrl={SITE_URL}
      />
    </div>
  );
}
