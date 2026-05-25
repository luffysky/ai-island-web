import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { BrandVoiceClient } from "./BrandVoiceClient";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

export default async function BrandPage() {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("brand_voice").select("*").eq("id", 1).maybeSingle();

  return (
    <div className="space-y-4">
      <PageHero
        emoji="🎨"
        title="品牌風格庫 (Brand Voice)"
        desc="設好之後、所有 AI 行銷工具 (文案 / 廣告 / Email) 都會自動套用這套風格。改完即時生效、不需重啟。"
        gradient="from-fuchsia-500/10 via-pink-500/10 to-rose-500/10"
        borderColor="border-fuchsia-500/30"
      />
      <BrandVoiceClient initial={data as any} />
    </div>
  );
}
