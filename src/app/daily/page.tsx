import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { moonPhase } from "@/lib/moon";
import { dailySentence, dailyTip, dayOfYear } from "@/lib/daily-content";
import { DailyDashboard } from "./DailyDashboard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "每日情報 · Morning Brief | AI 島",
  description: "天氣＋生活建議＋每日 AI 單字/一句/Tip＋月相——每天打開 AI 島、學一點的理由。",
};

// 每日情報儀表板（widget.md）：核心=天氣/生活建議、AI 區=每日一句/單字/Tip、+月相。
export default async function DailyPage() {
  const now = Date.now();

  // 今日 AI 單字（決定性：依當天挑一條 dictionary_terms）
  let word: { term: string; zh_name?: string; plain?: string; slug: string } | null = null;
  try {
    const admin = createSupabaseAdmin();
    const { count } = await admin.from("dictionary_terms").select("id", { count: "exact", head: true });
    if (count && count > 0) {
      const offset = dayOfYear(now) % count;
      const { data } = await admin.from("dictionary_terms").select("slug, term, zh_name, plain").order("id").range(offset, offset);
      const t = (data ?? [])[0] as any;
      if (t) word = { term: t.term, zh_name: t.zh_name ?? undefined, plain: t.plain ?? undefined, slug: t.slug };
    }
  } catch { /* DB 撈不到 → 略過此 widget */ }

  return (
    <DailyDashboard
      word={word}
      moon={moonPhase(now)}
      sentence={dailySentence(now)}
      tip={dailyTip(now)}
    />
  );
}
