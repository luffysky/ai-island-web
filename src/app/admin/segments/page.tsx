import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { SegmentsClient } from "./SegmentsClient";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

export default async function AdminSegmentsPage() {
  const admin = createSupabaseAdmin();
  const { data: segments } = await admin
    .from("user_segments")
    .select("*")
    .order("name");

  return (
    <div>
      <PageHero
        emoji="🎯"
        title="Segments"
        desc={`建立可重複使用的使用者區隔。filter_json 範例：${JSON.stringify({xp_gte:100,role:"member"})}`}
        gradient="from-cyan-500/10 via-purple-500/10 to-pink-500/10"
        borderColor="border-cyan-500/30"
      />
      <SegmentsClient initial={(segments ?? []) as any} />
    </div>
  );
}
