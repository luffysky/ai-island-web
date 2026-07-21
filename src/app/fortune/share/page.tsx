import type { Metadata } from "next";
import Link from "next/link";

/**
 * 今日運勢的「分享落地頁」（HTML）。
 * LINE / FB / Threads 靠抓 HTML 的 og:image 生連結預覽卡；直接丟圖片端點平台讀不到 og。
 * 這頁是真 HTML、og:image 指向 /api/og/fortune → 分享出去正常顯示運勢圖卡。
 * ＊命理供參考娛樂、不預言吉凶。
 */
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ai-island-web.snowrealm.pet";

type SP = { z?: string; e?: string; s?: string; o?: string; c?: string; n?: string; d?: string };

function readParams(sp: SP) {
  return {
    z: (sp.z || "星座").slice(0, 6),
    e: (sp.e || "✨").slice(0, 4),
    s: String(Math.max(0, Math.min(100, Number(sp.s) || 0))),
    o: (sp.o || "").slice(0, 90),
    c: (sp.c || "").slice(0, 8),
    n: (sp.n || "").slice(0, 4),
    d: (sp.d || "").slice(0, 12),
  };
}

function ogImageUrl(p: ReturnType<typeof readParams>) {
  const q = new URLSearchParams();
  q.set("z", p.z); q.set("e", p.e); q.set("s", p.s);
  if (p.o) q.set("o", p.o);
  if (p.c) q.set("c", p.c);
  if (p.n) q.set("n", p.n);
  if (p.d) q.set("d", p.d);
  return `/api/og/fortune?${q.toString()}`;
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const p = readParams(await searchParams);
  const title = `${p.e} ${p.z} 今日運勢 ${p.s} 分 · AI 島`;
  const desc = p.o ? p.o.slice(0, 110) : "來 AI 島測你的今日運勢（免費）。";
  const img = ogImageUrl(p);
  return {
    title,
    description: desc,
    alternates: { canonical: "/fortune/share" },
    robots: { index: false, follow: true },
    openGraph: {
      title, description: desc,
      images: [{ url: img, width: 1200, height: 630, alt: title }],
      type: "article", siteName: "AI 島", url: `${SITE_URL}/fortune/share`,
    },
    twitter: { card: "summary_large_image", title, description: desc, images: [img] },
  };
}

export default async function FortuneSharePage({ searchParams }: { searchParams: Promise<SP> }) {
  const p = readParams(await searchParams);
  const img = ogImageUrl(p);

  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="w-full max-w-[680px] overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt={`${p.z} 今日運勢`} width={1200} height={630} className="w-full h-auto block" />
      </div>

      <p className="text-fg-muted text-sm text-center">
        這是 <span className="text-accent font-semibold">{p.z}</span> 的今日運勢 · 命理僅供參考娛樂
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/fortune" className="px-5 py-2.5 rounded-full bg-accent text-black font-semibold hover:opacity-90 transition">
          🔮 測我的今日運勢
        </Link>
        <Link href="/" className="px-5 py-2.5 rounded-full border border-white/15 hover:bg-white/5 transition">
          🏝️ 逛 AI 島
        </Link>
      </div>
    </main>
  );
}
