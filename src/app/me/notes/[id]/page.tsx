import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServer } from "@/lib/supabase-server";
import { sanitizeRichHtmlStrict } from "@/lib/rich-html-server";

// 單篇筆記頁：全寬、舒服閱讀（解決筆記牆上展開變「長長一條、分段跑位」的問題 146）。
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const sb = await createSupabaseServer();
  const { data: note } = await sb.from("notes").select("title").eq("id", id).maybeSingle();
  return { title: `${(note as any)?.title || "筆記"} | AI 島` };
}

export default async function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  const { data: note } = await sb
    .from("notes")
    .select("id, user_id, title, content, category, tags, is_public, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (!note) {
    // 未登入且看不到 → 導去登入；否則當作找不到
    if (!user) redirect(`/login?next=/me/notes/${id}`);
    notFound();
  }
  const n = note as any;
  // 權限：擁有者本人，或公開筆記
  if (n.user_id !== user?.id && !n.is_public) {
    if (!user) redirect(`/login?next=/me/notes/${id}`);
    notFound();
  }

  const isHtml = /<[a-z][\s\S]*>/i.test(n.content || "");
  const tags: string[] = Array.isArray(n.tags) ? n.tags : [];

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10 min-w-0 overflow-hidden">
      <Link href="/me/notes" className="text-sm text-fg-muted hover:text-fg inline-flex items-center gap-1 mb-6">
        <ArrowLeft size={14} /> 回我的筆記
      </Link>

      {n.category && (
        <div className="inline-block text-[11px] font-bold tracking-wider uppercase text-accent bg-accent/10 px-2.5 py-1 rounded-full mb-3">
          {n.category}
        </div>
      )}
      <h1 className="text-2xl sm:text-3xl font-bold leading-snug mb-2">{n.title || "（無標題筆記）"}</h1>
      {n.updated_at && (
        <div className="text-xs text-fg-muted mb-6">更新於 {new Date(n.updated_at).toLocaleDateString("zh-TW")}</div>
      )}

      {isHtml ? (
        <div
          className="note-rich prose-custom prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizeRichHtmlStrict(n.content || "") }}
        />
      ) : (
        <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{n.content}</p>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-10 pt-6 border-t border-border">
          {tags.map((t) => (
            <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-bg-elevated text-fg-muted">#{t}</span>
          ))}
        </div>
      )}
    </article>
  );
}
