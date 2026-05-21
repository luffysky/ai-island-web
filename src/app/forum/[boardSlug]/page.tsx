import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createSupabaseAdmin } from "@/lib/supabase";
import { ThreadList } from "@/components/forum/ThreadList";
import { ArrowLeft, Plus } from "lucide-react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";

async function getBoard(slug: string) {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("forum_boards")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ boardSlug: string }>;
}): Promise<Metadata> {
  const { boardSlug } = await params;
  const board = await getBoard(boardSlug);
  if (!board) return { title: "找不到版塊 | AI 島" };
  return {
    title: `${board.name} | AI 島討論區`,
    description: board.description ?? "",
    alternates: { canonical: `${SITE_URL}/forum/${boardSlug}` },
  };
}

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardSlug: string }>;
}) {
  const { boardSlug } = await params;
  const board = await getBoard(boardSlug);
  if (!board) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <Link href="/forum" className="text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] flex items-center gap-1 mb-4">
        <ArrowLeft size={14} /> 討論區
      </Link>

      {/* 版塊 Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-4xl">{board.emoji}</span>
          <div>
            <h1 className="text-2xl font-bold">{board.name}</h1>
            <p className="text-sm text-[var(--color-fg-muted)]">{board.description}</p>
            <span className="text-xs text-[var(--color-fg-muted)]">{board.category}</span>
          </div>
        </div>
        <Link
          href={`/forum/new?board=${board.slug}`}
          className="px-4 py-2 rounded-lg bg-[var(--color-accent)] text-black font-semibold text-sm hover:scale-105 transition flex items-center gap-1"
        >
          <Plus size={16} /> 發表主題
        </Link>
      </div>

      {board.post_role === "admin" && (
        <div className="mb-4 text-xs text-[var(--color-fg-muted)] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-2">
          🔒 這個版塊只有管理員能發表主題
        </div>
      )}

      <ThreadList boardSlug={board.slug} />
    </div>
  );
}
