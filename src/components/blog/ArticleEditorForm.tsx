"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BlogEditor } from "@/components/blog/BlogEditor";
import { AiWriteHelper } from "@/components/blog/AiWriteHelper";
import { ImageUploader } from "@/components/ui/ImageUploader";
import { Save, Globe, Lock, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { slugify } from "@/lib/blog-types";

interface ArticleFormData {
  id?: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  cover_image: string;
  tags: string[];
  category: string;
  is_public: boolean;
  seo_title: string;
  seo_desc: string;
  series_id: string;
  series_order: string;
}

export function ArticleEditorForm({ initial }: { initial?: Partial<ArticleFormData> }) {
  const router = useRouter();
  const toast = useToast();
  const isEdit = !!initial?.id;
  const [data, setData] = useState<ArticleFormData>({
    id: initial?.id,
    title: initial?.title ?? "",
    slug: (initial as any)?.slug ?? "",
    summary: initial?.summary ?? "",
    content: initial?.content ?? "",
    cover_image: initial?.cover_image ?? "",
    tags: initial?.tags ?? [],
    category: initial?.category ?? "",
    is_public: initial?.is_public ?? false,
    seo_title: initial?.seo_title ?? "",
    seo_desc: initial?.seo_desc ?? "",
    series_id: (initial as any)?.series_id ?? "",
    series_order: (initial as any)?.series_order != null ? String((initial as any).series_order) : "",
  });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [showMeta, setShowMeta] = useState(false);
  // 還沒手動改過 slug → 跟著標題自動產生（已存在的文章預設視為「已自訂」、不亂動）
  const [slugTouched, setSlugTouched] = useState(!!(initial as any)?.slug);
  const [seriesList, setSeriesList] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    fetch("/api/blog/series")
      .then((r) => r.json())
      .then((j) => setSeriesList(j.series ?? []))
      .catch(() => {});
  }, []);

  const set = <K extends keyof ArticleFormData>(k: K, v: ArticleFormData[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !data.tags.includes(t)) set("tags", [...data.tags, t]);
    setTagInput("");
  };

  const save = async (publish?: boolean) => {
    if (!data.title.trim()) {
      toast.warning("請先填標題");
      return;
    }
    setSaving(true);
    const payload = {
      ...data,
      is_public: publish ?? data.is_public,
      series_id: data.series_id || null,
      series_order: data.series_order ? Number(data.series_order) : null,
    };
    const res = isEdit
      ? await fetch(`/api/blog/articles/${data.id}`, {
      credentials: "include",
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/blog/articles", {
      credentials: "include",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    setSaving(false);
    const json = await res.json();
    if (!res.ok) {
      toast.error("儲存失敗：" + (json.message || json.error));
      return;
    }
    toast.success(publish ? "已發佈文章" : "已存成草稿");
    router.push("/me/blog");
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <Link href="/me/blog" className="text-sm text-fg-muted hover:text-fg flex items-center gap-1">
          <ArrowLeft size={14} /> 回部落格
        </Link>
        <div className="flex gap-2">
          <button
            onClick={() => save(false)}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-bg-card border border-border text-sm font-medium hover:border-accent transition flex items-center gap-1 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            存成草稿
          </button>
          <button
            onClick={() => save(true)}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-accent text-black text-sm font-bold hover:scale-105 transition flex items-center gap-1 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
            發佈
          </button>
        </div>
      </div>

      {/* 標題 */}
      <input
        value={data.title}
        onChange={(e) => {
          const title = e.target.value;
          setData((d) => ({
            ...d,
            title,
            // slug 還沒被手動改過 → 自動跟著標題生成
            slug: slugTouched ? d.slug : slugify(title),
          }));
        }}
        placeholder="文章標題"
        className="w-full bg-transparent text-3xl font-bold mb-2 outline-none placeholder:text-fg-muted/40"
      />

      {/* 網址 slug（可自訂；發布後的文章連結就用這個）*/}
      <div className="flex items-center gap-1.5 mb-3 text-sm">
        <span className="text-fg-muted shrink-0 font-mono text-xs">/blogs/你/</span>
        <input
          value={data.slug}
          onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }}
          onBlur={(e) => set("slug", slugify(e.target.value))}
          placeholder="article-slug"
          className="flex-1 bg-bg-card border border-border rounded-lg px-2.5 py-1.5 text-sm font-mono outline-none focus:border-accent"
        />
        {data.slug && (
          <button
            type="button"
            onClick={() => { setSlugTouched(false); set("slug", slugify(data.title)); }}
            className="shrink-0 text-xs text-fg-muted hover:text-accent"
            title="改回用標題自動產生"
          >↺ 重設</button>
        )}
      </div>

      {/* 摘要 */}
      <textarea
        value={data.summary}
        onChange={(e) => set("summary", e.target.value)}
        placeholder="一句話摘要（會顯示在文章列表、搜尋結果）"
        rows={2}
        className="w-full bg-bg-card border border-border rounded-lg p-3 text-sm mb-4 outline-none focus:border-accent resize-none"
      />

      {/* TipTap 編輯器 */}
      <BlogEditor content={data.content} onChange={(html) => set("content", html)} />

      {/* 標籤 */}
      <div className="mt-4">
        <label className="text-sm font-medium mb-1.5 block">標籤</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {data.tags.map((t) => (
            <span key={t} className="text-xs px-2 py-1 rounded-full bg-bg-elevated flex items-center gap-1">
              #{t}
              <button onClick={() => set("tags", data.tags.filter((x) => x !== t))} className="text-fg-muted hover:text-red-400">×</button>
            </span>
          ))}
        </div>
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
          placeholder="輸入標籤後按 Enter"
          className="w-full bg-bg-card border border-border rounded-lg p-2 text-sm outline-none focus:border-accent"
        />
      </div>

      {/* 進階設定（封面、分類、SEO）*/}
      <div className="mt-4">
        <button
          onClick={() => setShowMeta(!showMeta)}
          className="text-sm text-fg-muted hover:text-fg"
        >
          {showMeta ? "▲ 收起" : "▼ 進階設定（封面圖、分類、SEO）"}
        </button>
        {showMeta && (
          <div className="mt-3 space-y-3 p-4 rounded-xl bg-bg-card border border-border">
            <div>
              <label className="text-sm font-medium mb-1 block">封面圖片</label>
              <ImageUploader
                folder="blog"
                value={data.cover_image}
                onUploaded={(url) => set("cover_image", url)}
                onClear={() => set("cover_image", "")}
                maxSizeMB={5}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">分類</label>
              <input
                value={data.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="例如：技術筆記、生活雜記"
                className="w-full bg-bg border border-border rounded-lg p-2 text-sm outline-none focus:border-accent"
              />
            </div>
            {seriesList.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">所屬系列</label>
                  <select
                    value={data.series_id}
                    onChange={(e) => set("series_id", e.target.value)}
                    className="w-full bg-bg border border-border rounded-lg p-2 text-sm outline-none focus:border-accent"
                  >
                    <option value="">不屬於任何系列</option>
                    {seriesList.map((s) => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">系列內順序</label>
                  <input
                    type="number"
                    value={data.series_order}
                    onChange={(e) => set("series_order", e.target.value)}
                    placeholder="例如 1"
                    className="w-full bg-bg border border-border rounded-lg p-2 text-sm outline-none focus:border-accent"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">SEO 標題（留空用文章標題）</label>
              <input
                value={data.seo_title}
                onChange={(e) => set("seo_title", e.target.value)}
                className="w-full bg-bg border border-border rounded-lg p-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">SEO 描述（留空用摘要）</label>
              <textarea
                value={data.seo_desc}
                onChange={(e) => set("seo_desc", e.target.value)}
                rows={2}
                className="w-full bg-bg border border-border rounded-lg p-2 text-sm outline-none focus:border-accent resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* AI 寫作助手（浮動按鈕）*/}
      <AiWriteHelper
        onInsert={(text) => set("content", data.content + `<p>${text.replace(/\n/g, "</p><p>")}</p>`)}
      />
    </div>
  );
}
