import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Palette, Sparkles, ArrowLeft } from "lucide-react";
import { getWork } from "@/lib/creator-engine/works";
import { createSupabaseAdmin } from "@/lib/supabase-admin";

// 公開唯讀作品頁：只給「已公開展示（is_showcased）」的作品；免登入、免 workspace 權限。
// （創作者的編輯頁在 /creator-island/works/[id]、要 workspace 成員；公開連結走這裡，避免 404）
export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  article: "文章", story: "故事", poem: "詩", idea: "點子", essay: "隨筆",
  thread: "長文", script: "腳本", design: "設計", note: "筆記", mix: "混合創作", song: "歌曲",
};

async function getPublicWork(id: string) {
  const work = await getWork(id).catch(() => null);
  // 只公開「已展示」的作品；未展示 / 不存在都當找不到（不外洩私人作品）
  if (!work || !work.is_showcased) return null;
  let author: { name: string | null; avatar: string | null } = { name: null, avatar: null };
  if (work.created_by) {
    const admin = createSupabaseAdmin();
    const { data: p } = await admin.from("profiles").select("username, display_name, avatar_url").eq("id", work.created_by).maybeSingle();
    if (p) author = { name: (p as any).display_name || (p as any).username || null, avatar: (p as any).avatar_url || null };
  }
  return { work, author };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = await getPublicWork(id);
  if (!data) return { title: "找不到作品 | AI 島" };
  const { work } = data;
  const sub = `${TYPE_LABEL[work.work_type] ?? "作品"}・AI 島作品牆`;
  const og = `/api/og?title=${encodeURIComponent((work.title || "作品").slice(0, 40))}&subtitle=${encodeURIComponent(sub)}`;
  return {
    title: `${work.title || "未命名作品"}｜AI 島作品牆`,
    description: sub,
    alternates: { canonical: `/works/${id}` },
    openGraph: { title: work.title || "作品", description: sub, images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: work.title || "作品", description: sub, images: [og] },
  };
}

export default async function PublicWorkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getPublicWork(id);
  if (!data) notFound();
  const { work, author } = data;

  // 純文字 body → 段落（保留換行）
  const paragraphs = (work.body || "").split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <Link href="/works" className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-accent mb-6">
        <ArrowLeft size={14} /> 回作品牆
      </Link>

      <article className="surface p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300 inline-flex items-center gap-1">
            <Palette size={11} /> {TYPE_LABEL[work.work_type] ?? work.work_type}
          </span>
          {work.showcased_at && (
            <span className="text-[11px] text-fg-muted">{new Date(work.showcased_at).toLocaleDateString("zh-TW")}</span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight">{work.title || "（未命名作品）"}</h1>

        <div className="flex items-center gap-2 mt-3 text-sm text-fg-muted">
          {author.avatar ? (
            <Image src={author.avatar} alt="" width={24} height={24} unoptimized className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <span className="w-6 h-6 rounded-full bg-accent/15 grid place-items-center text-accent"><Sparkles size={12} /></span>
          )}
          {author.name ?? "創作者"}
        </div>

        <div className="mt-6 space-y-4 leading-relaxed text-[15px] whitespace-pre-wrap break-words">
          {paragraphs.length > 0 ? (
            paragraphs.map((p, i) => <p key={i}>{p}</p>)
          ) : (
            <p className="text-fg-muted">（這篇作品還沒有內文）</p>
          )}
        </div>
      </article>

      <p className="text-center text-xs text-fg-muted mt-6">
        由創作者在{" "}
        <Link href="/creator-island" className="text-accent hover:underline">創作者島嶼</Link>
        {" "}用碎片編織而成
      </p>
    </div>
  );
}
