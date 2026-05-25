import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { ScheduleClient } from "./ScheduleClient";

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
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">📅 內容日曆 / 排程</h1>
        <p className="text-xs text-fg-muted mt-1 leading-relaxed">
          管理所有 marketing 草稿、設排程時間、預覽各平台版本。cron job 每分鐘掃排程到期的草稿、自動觸發發佈 (待接 OAuth)。
        </p>
      </div>
      <ScheduleClient initialDrafts={(data as any[]) ?? []} />
    </div>
  );
}
