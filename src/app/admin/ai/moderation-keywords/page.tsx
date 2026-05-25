import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { KeywordsClient } from "./KeywordsClient";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

export default async function AdminAiKeywordsPage() {
  const admin = createSupabaseAdmin();
  const { data: keywords } = await admin
    .from("ai_moderation_keywords")
    .select("*")
    .order("severity", { ascending: false })
    .order("category");

  return (
    <div>
      <PageHero
        emoji="🔤"
        title="AI 審核關鍵字"
        desc="L1 keyword 過濾 (最便宜層)。觸發後寫 ai_moderation_flags 給 admin 看、avoid LLM moderation 太貴。"
        gradient="from-rose-500/10 via-red-500/10 to-orange-500/10"
        borderColor="border-rose-500/30"
      />
      <KeywordsClient initial={(keywords ?? []) as any} />
    </div>
  );
}
