import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { ChangelogEditor } from "./ChangelogEditor";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

export default async function AdminChangelogPage() {
  const admin = createSupabaseAdmin();
  const { data: entries } = await admin
    .from("changelog_entries")
    .select("id, version, title, body_md, tags, published, published_at, updated_at")
    .order("published_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6">
      <PageHero
        emoji="📜"
        title="更新日誌管理"
        desc="管理 /changelog 公開頁面的內容。tags 用 feature / fix / improvement / breaking / security。"
        gradient="from-slate-500/10 via-blue-500/10 to-indigo-500/10"
        borderColor="border-slate-500/30"
      />
      <ChangelogEditor initial={(entries ?? []) as any} />
    </div>
  );
}
