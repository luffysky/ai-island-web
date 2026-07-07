import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { FORUM_CATEGORIES } from "@/lib/forum-types";
import { ForumClient } from "./ForumClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("forum");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: `${SITE_URL}/forum` },
  };
}

export default async function ForumHomePage() {
  const admin = createSupabaseAdmin();

  const { data: boards } = await admin
    .from("forum_boards")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const { data: threads } = await admin.from("forum_threads").select("board_id");
  const countByBoard: Record<string, number> = {};
  (threads ?? []).forEach((t: any) => {
    countByBoard[t.board_id] = (countByBoard[t.board_id] ?? 0) + 1;
  });

  const byCategory: Record<string, any[]> = {};
  (boards ?? []).forEach((b: any) => {
    (byCategory[b.category] ??= []).push(b);
  });

  return (
    <ForumClient
      categories={FORUM_CATEGORIES}
      byCategory={byCategory}
      countByBoard={countByBoard}
      totalThreads={(threads ?? []).length}
    />
  );
}
