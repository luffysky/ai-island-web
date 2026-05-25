import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { BrandVoiceClient } from "./BrandVoiceClient";

export const dynamic = "force-dynamic";

export default async function BrandPage() {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("brand_voice").select("*").eq("id", 1).maybeSingle();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">🎨 品牌風格庫 (Brand Voice)</h1>
        <p className="text-xs text-fg-muted mt-1 leading-relaxed">
          設好之後、所有 AI 行銷工具 (文案 / 廣告 / Email) 都會自動套用這套風格。
          改完即時生效、不需重啟 server。
        </p>
      </div>
      <BrandVoiceClient initial={data as any} />
    </div>
  );
}
