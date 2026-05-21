import { ArticleEditorForm } from "@/components/blog/ArticleEditorForm";
import { createSupabaseServer } from "@/lib/supabase";
import { redirect, notFound } from "next/navigation";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: article } = await supabase
    .from("user_blog_articles")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!article) notFound();

  return <ArticleEditorForm initial={article} />;
}
