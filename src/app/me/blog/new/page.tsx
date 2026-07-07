import { ArticleEditorForm } from "@/components/blog/ArticleEditorForm";
import { createSupabaseServer } from "@/lib/supabase-server";
import { allowedBlogIdentities } from "@/lib/blog-identities";

export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  let role: string | null = null;
  if (user) {
    const { data } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
    role = (data as any)?.role ?? null;
  }
  return <ArticleEditorForm allowedIdentities={allowedBlogIdentities(role)} />;
}
