import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { Palette, Sparkles } from "lucide-react";
import { listShowcasedWorks } from "@/lib/creator-engine/works";

// 公開作品牆：所有「已公開展示」的創作者作品（涵蓋創作者引擎各種模式 work_type）。公開頁、免登入。
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "作品牆 — 創作者公開作品 | AI 島",
  description: "AI 島創作者用碎片編織出來的公開作品，涵蓋文章、故事、點子等各種創作模式。",
  alternates: { canonical: "/works" },
};

/** work_type → 顯示中文（創作者引擎的各種模式）。 */
const TYPE_LABEL: Record<string, string> = {
  article: "文章", story: "故事", poem: "詩", idea: "點子", essay: "隨筆",
  thread: "長文", script: "腳本", design: "設計", note: "筆記", mix: "混合創作",
};

function excerpt(html: string, n = 140): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
}

export default async function WorksGalleryPage() {
  const works = await listShowcasedWorks(60);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold inline-flex items-center gap-2 justify-center">
          <Palette size={26} className="text-accent" /> 作品牆
        </h1>
        <p className="text-sm text-fg-muted">島上創作者用碎片編織出來的公開作品 · 各種創作模式都在這</p>
      </header>

      {works.length === 0 ? (
        <div className="surface p-12 text-center text-fg-muted">
          <div className="text-4xl mb-3">🎨</div>
          <p className="text-sm">還沒有公開的作品。</p>
          <p className="text-xs mt-1">
            創作者可以到{" "}
            <Link href="/creator-island" className="text-accent hover:underline">創作者島嶼</Link>
            {" "}把作品發佈到這裡。
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {works.map((w) => (
            <Link key={w.id} href={`/creator-island/works/${w.id}`} className="surface hover-lift p-5 block group">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300">
                  {TYPE_LABEL[w.work_type] ?? w.work_type}
                </span>
                {w.showcased_at && (
                  <span className="text-[10px] text-fg-muted">
                    {new Date(w.showcased_at).toLocaleDateString("zh-TW")}
                  </span>
                )}
              </div>
              <h2 className="font-bold text-lg group-hover:text-accent transition line-clamp-1">
                {w.title || "（未命名作品）"}
              </h2>
              <p className="text-sm text-fg-muted line-clamp-3 mt-1 leading-relaxed">{excerpt(w.body)}</p>
              <div className="flex items-center gap-2 mt-3 text-xs text-fg-muted">
                {w.author_avatar ? (
                  <Image src={w.author_avatar} alt="" width={20} height={20} unoptimized className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-accent/15 grid place-items-center text-accent"><Sparkles size={11} /></span>
                )}
                {w.author_name ?? "創作者"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
