import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { PageHero } from "@/components/admin/PageHero";
import { AffiliatesClient } from "./AffiliatesClient";

export const dynamic = "force-dynamic";

export default async function AffiliatesPage() {
  const admin = createSupabaseAdmin();
  // 列全部、enabled / disabled 都看得到 (UI 上灰掉的就是停用)
  const { data } = await admin
    .from("affiliate_codes")
    .select("*")
    .order("enabled", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-4">
      <PageHero
        emoji="🤝"
        title="推薦碼 / Affiliate"
        desc="KOL / 員工 / 學員 推薦碼。每碼可設折扣 % 跟佣金 %、追蹤點擊 / 轉換 / 收益 / 已付佣金。停用後該碼不再接受新使用、歷史保留。"
        gradient="from-cyan-500/10 via-teal-500/10 to-emerald-500/10"
        borderColor="border-cyan-500/30"
      />

      <AffiliatesClient initial={(data as any[]) ?? []} />
    </div>
  );
}
