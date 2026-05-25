import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { CampaignsClient } from "./CampaignsClient";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

export default async function AdminEmailCampaignsPage() {
  const admin = createSupabaseAdmin();
  const [{ data: campaigns }, { data: segments }] = await Promise.all([
    admin.from("email_campaigns").select("*").order("created_at", { ascending: false }).limit(100),
    admin.from("user_segments").select("id, name").order("name"),
  ]);

  return (
    <div>
      <PageHero
        emoji="✉️"
        title="Email Campaigns"
        desc="建立 / 排程 / 發送 email 行銷活動、追蹤開信率 + 點擊率。實際 SMTP 走 Resend。"
        gradient="from-indigo-500/10 via-purple-500/10 to-pink-500/10"
        borderColor="border-indigo-500/30"
      />
      <CampaignsClient initial={(campaigns ?? []) as any} segments={(segments ?? []) as any} />
    </div>
  );
}
