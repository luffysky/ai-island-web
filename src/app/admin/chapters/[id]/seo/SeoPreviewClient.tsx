"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Save, RotateCcw, ExternalLink, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type Defaults = { title: string; description: string; og_image: string };
type Override = { title?: string; description?: string; og_image?: string };

const AI_PRESETS: { key: string; label: string; promptSuffix: string; provider: string; model: string }[] = [
  { key: "anime", label: "🌸 動漫風", promptSuffix: "anime style, sakura petals, vibrant colors, learning platform poster", provider: "pollinations", model: "flux-anime" },
  { key: "cyberpunk", label: "🌃 賽博龐克", promptSuffix: "cyberpunk neon, futuristic city, deep blue purple, holographic", provider: "pollinations", model: "flux" },
  { key: "realistic", label: "📷 寫實", promptSuffix: "cinematic realistic photography, dramatic lighting, 4k", provider: "pollinations", model: "flux-realism" },
  { key: "minimal", label: "✨ 簡約", promptSuffix: "minimal flat design, pastel colors, geometric shapes, clean", provider: "pollinations", model: "flux" },
  { key: "cf-flux", label: "☁️ Cloudflare Flux (高品質)", promptSuffix: "anime poster, vibrant, learning platform", provider: "cloudflare", model: "@cf/black-forest-labs/flux-1-schnell" },
];

export function SeoPreviewClient({
  chapterId,
  chapterTitle,
  defaults,
  override,
  siteUrl,
}: {
  chapterId: number;
  chapterTitle: string;
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
          <label className="text-xs text-fg-muted block mb-1">OG Image URL（預設用 Satori 自動生圖、可改成 AI 圖）</label>
          <input
            value={og}
            onChange={(e) => setOg(e.target.value)}
            placeholder={defaults.og_image}
            className="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm font-mono"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="text-[10px] text-fg-muted self-center mr-1">
              <Sparkles size={11} className="inline mb-0.5" /> 一鍵套 AI 圖：
            </span>
            {AI_PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => {
                  const prompt = `${chapterTitle}, ${p.promptSuffix}`;
                  const url = `${siteUrl}/api/og/ai?provider=${p.provider}&prompt=${encodeURIComponent(prompt)}&model=${encodeURIComponent(p.model)}&seed=${chapterId}&w=1200&h=630`;
                  setOg(url);
                  toast.info(`已套 ${p.label}、按儲存才生效`);
                }}
                type="button"
                className="text-[10px] px-2 py-1 rounded-full border border-border hover:border-purple-400 hover:bg-purple-500/10 transition"
              >
                {p.label}
              </button>
            ))}
          </div>
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
