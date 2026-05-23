import Link from "next/link";
import type { Metadata } from "next";
import { createSupabaseAdmin } from "@/lib/supabase";
import { FORUM_CATEGORIES } from "@/lib/forum-types";
import { MessageSquare, Plus } from "lucide-react";
import { ForumSearch } from "@/components/forum/ForumSearch";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";

export const metadata: Metadata = {
  title: "討論區 | AI 島",
  description: "AI 島學習社群討論區——提問、分享心得、交流學習。",
  alternates: { canonical: `${SITE_URL}/forum` },
};

export default async function ForumHomePage() {
  const admin = createSupabaseAdmin();

  const { data: boards } = await admin
    .from("forum_boards")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  // 各版塊的主題串數
  const { data: threads } = await admin
    .from("forum_threads")
    .select("board_id");
  const countByBoard: Record<string, number> = {};
  (threads ?? []).forEach((t: any) => {
    countByBoard[t.board_id] = (countByBoard[t.board_id] ?? 0) + 1;
  });

  // 按分類分組
  const byCategory: Record<string, any[]> = {};
  (boards ?? []).forEach((b: any) => {
    (byCategory[b.category] ??= []).push(b);
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare size={28} className="text-accent" /> 討論區
          </h1>
          <p className="text-fg-muted mt-1">
            提問、分享、交流——AI 島的學習社群
          </p>
        </div>
        <Link
          href="/forum/new"
          className="px-4 py-2 rounded-lg bg-accent text-black font-semibold text-sm hover:scale-105 transition flex items-center gap-1"
        >
          <Plus size={16} /> 發表主題
        </Link>
      </div>

      {/* 搜尋 */}
      <ForumSearch />

      {/* 按分類列出版塊 */}
      <div className="space-y-8">
        {FORUM_CATEGORIES.map((cat) => {
          const list = byCategory[cat];
          if (!list || list.length === 0) return null;
          return (
            <section key={cat}>
              <h2 className="text-sm font-bold text-fg-muted uppercase tracking-wider mb-3">
                {cat}
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {list.map((b: any) => (
                  <Link
                    key={b.id}
                    href={`/forum/${b.slug}`}
                    className="rounded-xl border border-border bg-bg-card p-4 hover:border-accent transition flex items-start gap-3"
                  >
                    <span className="text-2xl">{b.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold">{b.name}</h3>
                      <p className="text-xs text-fg-muted line-clamp-1 mt-0.5">
                        {b.description}
                      </p>
                      <div className="text-[11px] text-fg-muted mt-1">
                        {countByBoard[b.id] ?? 0} 則討論
                        {b.post_role === "admin" && " · 🔒 限管理員發文"}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
