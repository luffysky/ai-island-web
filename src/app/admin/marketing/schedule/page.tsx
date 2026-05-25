import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { ScheduleClient } from "./ScheduleClient";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("marketing_drafts")
    .select("*")
    .neq("status", "archived")
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-4">
      <PageHero
        emoji="📅"
        title="內容日曆 / 排程"
        desc="管理所有 marketing 草稿、設排程時間、預覽各平台版本。cron job 每分鐘掃到期草稿、自動觸發發佈 (待接 OAuth)。"
        gradient="from-blue-500/10 via-sky-500/10 to-cyan-500/10"
        borderColor="border-blue-500/30"
      />
      <ScheduleClient initialDrafts={(data as any[]) ?? []} />
    </div>
  );
}
