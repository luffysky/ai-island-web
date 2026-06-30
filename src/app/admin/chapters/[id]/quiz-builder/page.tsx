import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getChapter } from "@/lib/content";
import { notFound } from "next/navigation";
import Link from "next/link";
import { adminHref } from "@/lib/admin-href";
import { QuizBuilder } from "./QuizBuilder";
import { PageHero } from "@/components/admin/PageHero";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function QuizBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const chapter = await getChapter(Number(id));
  if (!chapter) notFound();

  const admin = createSupabaseAdmin();
  const { data: existing } = await admin
    .from("chapter_quizzes")
    .select("*")
    .eq("chapter_id", Number(id))
    .maybeSingle();

  return (
    <div className="space-y-4">
      <Link
        href={adminHref(`/admin/chapters/${id}`) as any}
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-accent"
      >
        <ArrowLeft className="w-4 h-4" /> 回章節編輯
      </Link>
      <PageHero
        emoji="📝"
        title={`Ch${String(chapter.id).padStart(2, "0")} 章末測驗`}
        desc={`${chapter.title} · AI 出題助手會吃整章 lesson 內容自動產 20 題草稿、admin 校稿後存檔。`}
        gradient="from-purple-500/10 via-fuchsia-500/10 to-pink-500/10"
        borderColor="border-purple-500/30"
      />
      <QuizBuilder chapterId={Number(id)} initialQuiz={existing} />
    </div>
  );
}
