import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { ShareAnswer } from "./ShareAnswer";

/**
 * AI 回答分享落地頁（短連結版）。
 * 短 token → 從 ai_shares 撈完整 Q&A：og:image 給社群預覽、頁面本身撐完整回答（不截斷）。
 */
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ai-island-web.snowrealm.pet";

type Share = { persona: string; question: string; answer: string };

async function loadShare(token: string): Promise<Share | null> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("ai_shares").select("persona, question, answer").eq("token", token).maybeSingle();
  return (data as Share) ?? null;
}

function ogImageUrl(s: Share) {
  const p = new URLSearchParams();
  p.set("persona", s.persona);
  if (s.question) p.set("q", s.question.slice(0, 70));
  if (s.answer) p.set("a", s.answer.slice(0, 400));
  return `/api/og/share-ai?${p.toString()}`;
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const s = await loadShare(token);
  if (!s) return { title: "分享不存在 · AI 島", robots: { index: false } };
  const title = s.question ? `${s.persona}：${s.question}` : `${s.persona} 的回答 · AI 島`;
  const desc = s.answer ? s.answer.replace(/[#*`>]/g, "").slice(0, 110) : "在 AI 島問綠寶、邊學邊問。";
  const img = ogImageUrl(s);
  return {
    title, description: desc,
    alternates: { canonical: `/share/ai/${token}` },
    robots: { index: false, follow: true },
    openGraph: { title, description: desc, images: [{ url: img, width: 1200, height: 630, alt: title }], type: "article", siteName: "AI 島", url: `${SITE_URL}/share/ai/${token}` },
    twitter: { card: "summary_large_image", title, description: desc, images: [img] },
  };
}

export default async function ShareAITokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const s = await loadShare(token);
  if (!s) notFound();

  return (
    <main className="min-h-[70vh] max-w-[760px] mx-auto px-4 py-10 space-y-6">
      <div className="text-center space-y-1">
        <div className="text-sm text-fg-muted">這是 <span className="text-accent font-semibold">{s.persona}</span> 在 AI 島的回答 · 邊學邊問</div>
        {s.question && <h1 className="text-xl sm:text-2xl font-bold">{s.question}</h1>}
      </div>

      {/* 完整回答（撐完整、不截斷） */}
      <article className="rounded-2xl border border-border bg-bg-card p-5 sm:p-6 shadow-sm">
        <div className="text-xs text-fg-muted mb-3 flex items-center gap-1.5">✨ {s.persona} 的完整回答</div>
        <ShareAnswer answer={s.answer} />
      </article>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className="px-5 py-2.5 rounded-full bg-accent text-black font-semibold hover:opacity-90 transition">🏝️ 來 AI 島問綠寶</Link>
        <Link href="/chapters" className="px-5 py-2.5 rounded-full border border-border hover:bg-bg-elevated transition">看課程</Link>
      </div>
    </main>
  );
}
