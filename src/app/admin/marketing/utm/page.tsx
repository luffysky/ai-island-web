import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { UtmBuilderClient } from "./UtmBuilderClient";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aiisland.tw";

export default async function UtmPage() {
  const admin = createSupabaseAdmin();
  const { data: links } = await admin
    .from("utm_links")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-4">
      <PageHero
        emoji="🔗"
        title="UTM Builder"
        desc={`建短連結 + UTM 參數、追蹤每個 campaign / source / medium 的點擊跟轉換。產出短碼 ${SITE_URL}/s/<code>、貼到社群 / 廣告 / Email、自動 redirect 帶 UTM。`}
        gradient="from-purple-500/10 via-violet-500/10 to-indigo-500/10"
        borderColor="border-purple-500/30"
      />
      <UtmBuilderClient initialLinks={(links as any[]) ?? []} siteUrl={SITE_URL} />
    </div>
  );
}
