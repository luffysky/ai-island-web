import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { CampaignsClient } from "./CampaignsClient";

export const dynamic = "force-dynamic";

export default async function AdminEmailCampaignsPage() {
  const admin = createSupabaseAdmin();
  const [{ data: campaigns }, { data: segments }] = await Promise.all([
    admin.from("email_campaigns").select("*").order("created_at", { ascending: false }).limit(100),
    admin.from("user_segments").select("id, name").order("name"),
  ]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">📧 Email Campaigns</h1>
        <p className="text-sm text-fg-muted mt-1">
          建立 / 排程 / 發送 email 行銷活動、追蹤開信率 + 點擊率。實際 SMTP 待接 Resend。
        </p>
      </header>
      <CampaignsClient initial={(campaigns ?? []) as any} segments={(segments ?? []) as any} />
    </div>
  );
}
