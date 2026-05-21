"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { PenLine, Plus, Eye, Settings, Trash2, ExternalLink, Globe, Lock } from "lucide-react";

export default function MyBlogPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    (async () => {
      const [aRes, sRes] = await Promise.all([
        fetch("/api/blog/articles"),
        fetch("/api/blog/settings"),
      ]);
      const a = await aRes.json();
      const s = await sRes.json();
      setArticles(a.articles ?? []);
      setSettings(s.settings ?? null);
      setLoading(false);
    })();
  }, []);

  const deleteArticle = async (id: string) => {
    if (!confirm("確定刪除這篇文章？無法復原。")) return;
    const res = await fetch(`/api/blog/articles/${id}`, { method: "DELETE" });
    if (res.ok) setArticles((prev) => prev.filter((a) => a.id !== id));
    else alert("刪除失敗");
  };

  const blogUrl = settings?.blog_slug
    ? `/blogs/${settings.blog_slug}`
    : settings
    ? `/blogs/${settings.user_id}`
    : "#";

  if (loading) {
    return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-[var(--color-bg-card)] animate-pulse" />)}</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PenLine size={22} className="text-[var(--color-accent)]" /> 我的部落格
          </h1>
          <p className="text-sm text-[var(--color-fg-muted)] mt-1">
            {settings?.blog_title || "尚未設定部落格標題"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={blogUrl as any}
            target="_blank"
            className="px-3 py-2 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] text-sm hover:border-[var(--color-accent)] transition flex items-center gap-1"
          >
            <ExternalLink size={14} /> 看我的部落格
          </Link>
          <Link
            href="/me/blog/settings"
            className="px-3 py-2 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] text-sm hover:border-[var(--color-accent)] transition flex items-center gap-1"
          >
            <Settings size={14} /> 設定
          </Link>
          <Link
            href="/me/blog/new"
            className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-black font-semibold text-sm hover:scale-105 transition flex items-center gap-1"
          >
            <Plus size={16} /> 寫新文章
          </Link>
        </div>
      </div>

      {/* 文章列表 */}
      {articles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--color-border)] p-12 text-center">
          <PenLine size={40} className="mx-auto mb-3 text-[var(--color-fg-muted)] opacity-50" />
          <p className="text-[var(--color-fg-muted)] mb-4">還沒有文章、寫第一篇吧</p>
          <Link
            href="/me/blog/new"
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-[var(--color-accent)] text-black font-semibold text-sm"
          >
            <Plus size={16} /> 開始寫作
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {articles.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 flex items-center gap-4"
            >
              {a.cover_image && (
                <img src={a.cover_image} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold truncate">{a.title}</h3>
                  {a.is_public ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 flex items-center gap-0.5 flex-shrink-0">
                      <Globe size={9} /> 公開
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-elevated)] text-[var(--color-fg-muted)] flex items-center gap-0.5 flex-shrink-0">
                      <Lock size={9} /> 草稿
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--color-fg-muted)] line-clamp-1">
                  {a.summary || "（沒有摘要）"}
                </p>
                <div className="text-[11px] text-[var(--color-fg-muted)] mt-1 flex items-center gap-3">
                  <span className="flex items-center gap-0.5"><Eye size={11} /> {a.view_count}</span>
                  <span>{new Date(a.updated_at).toLocaleDateString("zh-TW")}</span>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Link
                  href={`/me/blog/edit/${a.id}`}
                  className="px-3 py-1.5 rounded-lg bg-[var(--color-bg-elevated)] text-sm hover:text-[var(--color-accent)] transition"
                >
                  編輯
                </Link>
                <button
                  onClick={() => deleteArticle(a.id)}
                  aria-label="刪除"
                  className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
