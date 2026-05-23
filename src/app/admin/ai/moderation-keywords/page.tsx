import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { KeywordsClient } from "./KeywordsClient";

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
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">🔍 AI 審核關鍵字</h1>
        <p className="text-sm text-fg-muted mt-1">
          L1 keyword 過濾（最便宜層）。觸發後寫 ai_moderation_flags 給 admin 看。
        </p>
      </header>
      <KeywordsClient initial={(keywords ?? []) as any} />
    </div>
  );
}
