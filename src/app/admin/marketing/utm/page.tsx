import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { UtmBuilderClient } from "./UtmBuilderClient";

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
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">🔗 UTM Builder</h1>
        <p className="text-xs text-fg-muted mt-1 leading-relaxed">
          建短連結 + UTM 參數、追蹤每個 campaign / source / medium 的點擊跟轉換。<br />
          產出短碼 <code className="text-purple-300">{SITE_URL}/s/&lt;code&gt;</code>、貼到社群 / 廣告 / Email、自動 redirect 帶 UTM 到目標頁。
        </p>
      </div>
      <UtmBuilderClient initialLinks={(links as any[]) ?? []} siteUrl={SITE_URL} />
    </div>
  );
}
