import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

export default async function AdsPage() {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("ad_creatives")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (data as any[]) ?? [];

  return (
    <div className="space-y-4">
      <PageHero
        emoji="🎯"
        title="廣告 Copy 產生"
        desc="AI 為 Meta / Google / TikTok / LINE Ads 生 A/B 版廣告文案 (Headline / Primary / Description / CTA)、含字數檢查、套 brand voice。"
        gradient="from-red-500/10 via-pink-500/10 to-fuchsia-500/10"
        borderColor="border-red-500/30"
      />

      <div className="bg-purple-500/5 border border-purple-500/30 rounded-2xl p-4 text-sm">
        <div className="font-bold text-purple-300 mb-2">📋 已建廣告 ({rows.length})</div>
        {rows.length === 0 ? (
          <p className="text-xs text-fg-muted">還沒有建任何廣告 copy。功能介面開發中、需要時可手動 INSERT 到 ad_creatives 表、或等下輪迭代加 UI。</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="bg-bg-card border border-border rounded-lg p-3 text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold">{r.campaign_name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated">{r.platform}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated">{r.status}</span>
                </div>
                <div className="text-fg-muted">{r.primary_text}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-bg-elevated/40 border border-border rounded-2xl p-4 text-xs leading-relaxed text-fg-muted">
        <div className="font-bold text-fg mb-1">📐 廣告 copy 守則</div>
        <ul className="list-disc list-inside space-y-1">
          <li>Meta：Headline 40 字、Primary Text 125 字、Description 30 字、3-5 個 headline A/B</li>
          <li>Google Search：3 個 Headline (30 字)、2 個 Description (90 字)、Final URL</li>
          <li>TikTok：標題 100 字、影片 9-15 秒、第一秒就要鉤住</li>
          <li>LINE Ads：標題 25 字、文案 75 字、適合 LINE 內嵌體驗</li>
          <li>每個 ad set 至少 3 個 creative 跑 A/B、保留前 2 月 data 再優化</li>
        </ul>
      </div>
    </div>
  );
}
