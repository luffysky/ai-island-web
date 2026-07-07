import { ArticleEditorForm } from "@/components/blog/ArticleEditorForm";
import { createSupabaseServer } from "@/lib/supabase";
import { redirect, notFound } from "next/navigation";
import { allowedBlogIdentities } from "@/lib/blog-identities";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: article }, { data: prof }] = await Promise.all([
    supabase.from("user_blog_articles").select("*").eq("id", id).eq("user_id", user.id).single(),
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);

  if (!article) notFound();

  return <ArticleEditorForm initial={article} allowedIdentities={allowedBlogIdentities((prof as any)?.role)} />;
}
