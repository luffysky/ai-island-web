import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getChapter } from "@/lib/content";
import { notFound } from "next/navigation";
import Link from "next/link";
import { adminHref } from "@/lib/admin-href";
import { QuizBuilder } from "./QuizBuilder";

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
        className="text-sm text-fg-muted hover:text-accent"
      >
        ← 回章節編輯
      </Link>
      <div>
        <h2 className="text-xl font-bold">📝 Ch{String(chapter.id).padStart(2, "0")} 章末測驗</h2>
        <p className="text-sm text-fg-muted mt-1">
          {chapter.title}{" "}
          · <span className="text-accent">AI 出題助手</span> 會吃整章 lesson 內容自動產 20 題草稿、admin 校稿後存檔。
        </p>
      </div>
      <QuizBuilder chapterId={Number(id)} initialQuiz={existing} />
    </div>
  );
}
