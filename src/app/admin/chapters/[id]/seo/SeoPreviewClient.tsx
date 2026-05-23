"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Save, RotateCcw, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type Defaults = { title: string; description: string; og_image: string };
type Override = { title?: string; description?: string; og_image?: string };

export function SeoPreviewClient({
  chapterId,
  defaults,
  override,
  siteUrl,
}: {
  chapterId: number;
  defaults: Defaults;
  override: Override;
  siteUrl: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState(override.title ?? "");
  const [desc, setDesc] = useState(override.description ?? "");
  const [og, setOg] = useState(override.og_image ?? "");

  const finalTitle = title.trim() || defaults.title;
  const finalDesc = desc.trim() || defaults.description;
  const finalOg = og.trim() || defaults.og_image;
  const url = `${siteUrl}/chapters/${chapterId}`;

  const save = async () => {
    try {
      const res = await fetch("/api/admin/seo-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: `/chapters/${chapterId}`,
          title: title.trim() || null,
          description: desc.trim() || null,
          og_image: og.trim() || null,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("已儲存 SEO override");
      router.refresh();
    } catch {
      toast.error("儲存失敗");
    }
  };

  const reset = () => {
    setTitle("");
    setDesc("");
    setOg("");
    toast.info("已清空、按儲存才真的清掉 DB");
  };

  return (
    <div className="space-y-6">
      {/* 編輯區 */}
      <div className="rounded-xl bg-bg-card border border-border p-4 space-y-3">
        <h2 className="font-bold text-sm">編輯 SEO override（空白 = 用預設）</h2>
        <div>
          <label className="text-xs text-fg-muted block mb-1">Title（建議 50-60 字）</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={defaults.title}
            maxLength={120}
            className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
          />
          <div className="text-[10px] text-fg-muted mt-0.5">{title.length} / 60 字（超過會被 Google 截掉）</div>
        </div>
        <div>
          <label className="text-xs text-fg-muted block mb-1">Description（建議 150-160 字）</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder={defaults.description}
            rows={3}
            maxLength={300}
            className="w-full bg-bg border border-border rounded-lg p-2 text-sm"
          />
          <div className="text-[10px] text-fg-muted mt-0.5">{desc.length} / 160 字</div>
        </div>
        <div>
          <label className="text-xs text-fg-muted block mb-1">OG Image URL（預設用自動生圖）</label>
          <input
            value={og}
            onChange={(e) => setOg(e.target.value)}
            placeholder={defaults.og_image}
            className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm font-mono"
          />
        </div>
        <div className="flex gap-2 pt-2 border-t border-border">
          <button onClick={save} className="px-4 py-1.5 rounded-lg bg-accent text-black font-bold text-sm flex items-center gap-1">
            <Save size={13} /> 儲存
          </button>
          <button onClick={reset} className="px-4 py-1.5 rounded-lg border border-border text-sm flex items-center gap-1">
            <RotateCcw size={13} /> 清空
          </button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="ml-auto text-xs text-fg-muted hover:text-accent flex items-center gap-1"
          >
            <ExternalLink size={12} /> 看實際頁面
          </a>
        </div>
      </div>

      {/* Google snippet 模擬 */}
      <div>
        <h2 className="font-bold text-sm mb-2">Google 搜尋結果預覽</h2>
        <div className="rounded-xl bg-white text-black p-4 max-w-xl">
          <div className="text-xs text-gray-500 truncate">{url}</div>
          <div className="text-xl text-blue-700 mt-1 leading-tight truncate hover:underline cursor-pointer">{finalTitle}</div>
          <div className="text-sm text-gray-700 mt-1 line-clamp-2">{finalDesc}</div>
        </div>
      </div>

      {/* OG card 模擬 */}
      <div>
        <h2 className="font-bold text-sm mb-2">社群分享預覽（Open Graph）</h2>
        <div className="rounded-xl border border-border overflow-hidden max-w-md bg-bg-card">
          <div className="relative w-full aspect-[1.91/1] bg-bg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={finalOg} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
          <div className="p-3 text-sm">
            <div className="text-[10px] text-fg-muted uppercase truncate">{new URL(siteUrl).hostname}</div>
            <div className="font-bold truncate">{finalTitle}</div>
            <div className="text-xs text-fg-muted line-clamp-2 mt-0.5">{finalDesc}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
