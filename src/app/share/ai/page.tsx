import type { Metadata } from "next";
import Link from "next/link";

/**
 * 綠寶 AI 回答的「分享落地頁」（HTML）。
 *
 * 為什麼需要這頁：LINE / FB / Threads 等是靠抓「HTML 的 og:image meta」來生連結預覽卡的。
 * 早期直接把圖片端點 /api/og/share-ai（回傳 PNG、無 HTML）丟去分享，平台讀不到 og 標籤，
 * 只能把那串含百分比編碼中文的長網址當純文字貼出 → 看起來像亂碼。
 * 這頁是真正的 HTML，og:image 指向那個圖片端點，平台抓得到 → 正常顯示圖卡。
 */
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ai-island-web.snowrealm.pet";

type SP = { persona?: string; q?: string; a?: string };

function readParams(sp: SP) {
  const persona = (sp.persona || "綠寶").slice(0, 12);
  const q = (sp.q || "").slice(0, 70);
  const a = (sp.a || "").slice(0, 400);
  return { persona, q, a };
}

function ogImageUrl({ persona, q, a }: { persona: string; q: string; a: string }) {
  const p = new URLSearchParams();
  p.set("persona", persona);
  if (q) p.set("q", q);
  if (a) p.set("a", a);
  return `/api/og/share-ai?${p.toString()}`;
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const sp = await searchParams;
  const { persona, q, a } = readParams(sp);
  const title = q ? `${persona}：${q}` : `${persona} 的回答 · AI 島`;
  const desc = a ? a.slice(0, 110) : "在 AI 島問綠寶、邊學邊問。";
  const img = ogImageUrl({ persona, q, a });
  return {
    title,
    description: desc,
    alternates: { canonical: "/share/ai" },
    // 分享卡是動態內容，不進搜尋索引
    robots: { index: false, follow: true },
    openGraph: {
      title,
      description: desc,
      images: [{ url: img, width: 1200, height: 630, alt: title }],
      type: "article",
      siteName: "AI 島",
      url: `${SITE_URL}/share/ai`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [img],
    },
  };
}

export default async function ShareAIPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { persona, q, a } = readParams(sp);
  const img = ogImageUrl({ persona, q, a });

  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="w-full max-w-[680px] overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
        {/* 直接顯示同一張 OG 圖卡，點進來的人看到的跟 LINE 預覽一致 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt={`${persona} 的回答`} width={1200} height={630} className="w-full h-auto block" />
      </div>

      <div className="text-center space-y-1">
        <p className="text-fg-muted text-sm">
          這是 <span className="text-accent font-semibold">{persona}</span> 在 AI 島的回答 · 邊學邊問
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="px-5 py-2.5 rounded-full bg-accent text-black font-semibold hover:opacity-90 transition"
        >
          🏝️ 來 AI 島問綠寶
        </Link>
        <Link
          href="/chapters"
          className="px-5 py-2.5 rounded-full border border-white/15 hover:bg-white/5 transition"
        >
          看課程
        </Link>
      </div>
    </main>
  );
}
