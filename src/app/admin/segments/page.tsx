import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { SegmentsClient } from "./SegmentsClient";

export const dynamic = "force-dynamic";

export default async function AdminSegmentsPage() {
  const admin = createSupabaseAdmin();
  const { data: segments } = await admin
    .from("user_segments")
    .select("*")
    .order("name");

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">🎯 Segments</h1>
        <p className="text-sm text-fg-muted mt-1">
          建立可重複使用的使用者區隔。filter_json 範例：{`{"xp_gte":100,"role":"member"}`}
        </p>
      </header>
      <SegmentsClient initial={(segments ?? []) as any} />
    </div>
  );
}
