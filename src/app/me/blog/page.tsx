"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { PenLine, Plus, Eye, Settings, Trash2, ExternalLink, Globe, Lock } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";

export default function MyBlogPage() {
  const toast = useToast();
  const confirm = useConfirm();
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
    const target = articles.find((a) => a.id === id);
    if (!target) return;
    const ok = await confirm({
      title: `刪除「${target.title}」？`,
      description: "5 秒內可在右下方提示中撤銷。",
      confirmLabel: "刪除",
      destructive: true,
    });
    if (!ok) return;

    const snapshot = articles;
    setArticles((prev) => prev.filter((a) => a.id !== id));

    let undone = false;
    toast.warning("已刪除一篇文章", {
      duration: 5000,
      action: {
        label: "撤銷",
        onClick: () => {
          undone = true;
          setArticles(snapshot);
        },
      },
    });

    setTimeout(async () => {
      if (undone) return;
      const res = await fetch(`/api/blog/articles/${id}`, {
      credentials: "include", method: "DELETE" });
      if (!res.ok) {
        setArticles(snapshot);
        toast.error("刪除失敗、已恢復");
      }
    }, 5000);
  };

  const blogUrl = settings?.blog_slug
    ? `/blogs/${settings.blog_slug}`
    : settings
    ? `/blogs/${settings.user_id}`
    : "#";

  if (loading) {
    return <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-bg-card animate-pulse" />)}</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PenLine size={22} className="text-accent" /> 我的部落格
          </h1>
          <p className="text-sm text-fg-muted mt-1">
            {settings?.blog_title || "尚未設定部落格標題"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={blogUrl as any}
            target="_blank"
            className="px-3 py-2 rounded-lg bg-bg-card border border-border text-sm hover:border-accent transition flex items-center gap-1"
          >
            <ExternalLink size={14} /> 看我的部落格
          </Link>
          <Link
            href="/me/blog/settings"
            className="px-3 py-2 rounded-lg bg-bg-card border border-border text-sm hover:border-accent transition flex items-center gap-1"
          >
            <Settings size={14} /> 設定
          </Link>
          <Link
            href="/me/blog/new"
            className="px-4 py-2 rounded-lg bg-accent text-black font-semibold text-sm hover:scale-105 transition flex items-center gap-1"
          >
            <Plus size={16} /> 寫新文章
          </Link>
        </div>
      </div>

      {/* 文章列表 */}
      {articles.length === 0 ? (
        <EmptyState emoji="✍️" title="還沒有文章" desc="寫第一篇分享學習心得" action={{ label: "開始寫作", href: "/me/blog/new" }} />
      ) : (
        <div className="space-y-2">
          {articles.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-border bg-bg-card p-4 flex items-center gap-4"
            >
              {a.cover_image && (
                <Image
                  src={a.cover_image}
                  alt=""
                  width={64}
                  height={64}
                  unoptimized
                  className="w-16 h-16 rounded-lg object-cover shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold truncate">{a.title}</h3>
                  {a.is_public ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-900 dark:text-green-200 flex items-center gap-0.5 shrink-0">
                      <Globe size={9} /> 公開
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated text-fg-muted flex items-center gap-0.5 shrink-0">
                      <Lock size={9} /> 草稿
                    </span>
                  )}
                </div>
                <p className="text-xs text-fg-muted line-clamp-1">
                  {a.summary || "（沒有摘要）"}
                </p>
                <div className="text-[11px] text-fg-muted mt-1 flex items-center gap-3">
                  <span className="flex items-center gap-0.5"><Eye size={11} /> {a.view_count}</span>
                  <span>{new Date(a.updated_at).toLocaleDateString("zh-TW")}</span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                {a.is_public && blogUrl !== "#" && (
                  <Link
                    href={`${blogUrl}/${a.slug}` as any}
                    target="_blank"
                    className="px-3 py-1.5 rounded-lg bg-bg-elevated text-sm hover:text-accent transition flex items-center gap-1"
                    title="在新分頁查看公開文章"
                  >
                    <ExternalLink size={13} /> 查看
                  </Link>
                )}
                <Link
                  href={`/me/blog/edit/${a.id}`}
                  className="px-3 py-1.5 rounded-lg bg-bg-elevated text-sm hover:text-accent transition"
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
