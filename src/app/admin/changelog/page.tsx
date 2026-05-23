import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { ChangelogEditor } from "./ChangelogEditor";

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
      <header>
        <h1 className="text-2xl font-bold">📜 更新日誌管理</h1>
        <p className="text-sm text-fg-muted mt-1">
          管理 /changelog 公開頁面的內容。tags 用 feature / fix / improvement / breaking / security。
        </p>
      </header>
      <ChangelogEditor initial={(entries ?? []) as any} />
    </div>
  );
}
