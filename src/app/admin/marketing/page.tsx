import Link from "next/link";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { adminHref } from "@/lib/admin-href";
import { Rocket, Lightbulb, Ruler, BarChart3, Repeat, Target, FileText, Calendar, Send, Link2, Palette, Handshake, Search } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MarketingHubPage() {
  const admin = createSupabaseAdmin();
  const [drafts, utm, ads, affiliates, comp] = await Promise.all([
    admin.from("marketing_drafts").select("id, status").limit(500),
    admin.from("utm_links").select("id, click_count, conversion, revenue").is("archived_at", null).limit(500),
    admin.from("ad_creatives").select("id, status").limit(500),
    admin.from("affiliate_codes").select("id, click_count, conversion, revenue").eq("enabled", true).limit(500),
    admin.from("competitor_snapshots").select("id").limit(200),
  ]);

  const draftRows = (drafts.data as any[]) ?? [];
  const draftDraft = draftRows.filter((r) => r.status === "draft").length;
  const draftSched = draftRows.filter((r) => r.status === "scheduled").length;
  const draftPub = draftRows.filter((r) => r.status === "published").length;

  const utmRows = (utm.data as any[]) ?? [];
  const utmClicks = utmRows.reduce((s, r) => s + (r.click_count ?? 0), 0);
  const utmConv = utmRows.reduce((s, r) => s + (r.conversion ?? 0), 0);
  const utmRev = utmRows.reduce((s, r) => s + Number(r.revenue ?? 0), 0);

  const adRows = (ads.data as any[]) ?? [];
  const adRunning = adRows.filter((r) => r.status === "running").length;

  const affRows = (affiliates.data as any[]) ?? [];
  const affRev = affRows.reduce((s, r) => s + Number(r.revenue ?? 0), 0);

  const compCount = (comp.data as any[])?.length ?? 0;

  const modules = [
    { href: "/admin/marketing/copy", icon: FileText, title: "AI 文案產生器", desc: "同一主題 → FB / IG / X / Threads / LINE / Email / Blog 7 平台不同 copy" },
    { href: "/admin/marketing/schedule", icon: Calendar, title: "內容日曆 / 排程", desc: `${draftDraft} 草稿、${draftSched} 排程中、${draftPub} 已發佈` },
    { href: "/admin/marketing/publish", icon: Send, title: "多平台一鍵發佈", desc: "FB / IG / X / Threads / LINE OA / Blog / Email (OAuth 後啟用)" },
    { href: "/admin/marketing/ads", icon: Target, title: "廣告 Copy 產生", desc: `Meta / Google / TikTok 廣告 copy、${adRunning} 個 running` },
    { href: "/admin/marketing/utm", icon: Link2, title: "UTM Builder", desc: `${utmRows.length} 條短連結、累積 ${utmClicks.toLocaleString()} 次點擊、轉換 ${utmConv} 筆、NT$ ${utmRev.toLocaleString()}` },
    { href: "/admin/marketing/brand", icon: Palette, title: "品牌風格庫", desc: "Brand voice / Tagline / Hashtag pool / 文案守則" },
    { href: "/admin/marketing/affiliates", icon: Handshake, title: "推薦碼 / Affiliate", desc: `${affRows.length} 個有效推薦碼、佣金累積 NT$ ${affRev.toLocaleString()}` },
    { href: "/admin/marketing/competitor", icon: Search, title: "競品 / 關鍵字", desc: `${compCount} 個競品快照、AI 抓取 + 摘要` },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-2xl p-5">
        <h1 className="text-2xl font-extrabold mb-1 flex items-center gap-2"><Rocket className="w-6 h-6" /> 行銷主控台</h1>
        <p className="text-sm text-fg-muted">
          一站式管理文案 / 排程 / 多平台發佈 / 廣告 / UTM / 推薦碼 / 競品。所有產生都接 AI 輔助、配合站內品牌 voice 自動套用。
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {modules.map((m) => (
          <Link
            key={m.href}
            href={adminHref(m.href) as any}
            className="block p-4 rounded-2xl bg-bg-card border border-border hover:border-purple-400/60 hover:bg-bg-elevated/40 hover:scale-[1.01] transition group"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <m.icon className="w-6 h-6 text-accent" />
              <h3 className="font-bold text-base group-hover:text-accent transition">{m.title}</h3>
            </div>
            <p className="text-xs text-fg-muted leading-relaxed">{m.desc}</p>
          </Link>
        ))}
      </div>

      <div className="bg-bg-card border border-border rounded-2xl p-4">
        <h2 className="font-bold mb-2 text-sm flex items-center gap-2"><Lightbulb className="w-4 h-4" /> 行銷思維 (給林董快速參考)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px] text-fg-muted leading-relaxed">
          <div>
            <div className="font-bold text-fg mb-1 flex items-center gap-2"><Ruler className="w-4 h-4" /> AIDA 漏斗</div>
            <p>Awareness 認知 → Interest 興趣 → Desire 渴望 → Action 行動。每個階段對應不同內容類型。</p>
          </div>
          <div>
            <div className="font-bold text-fg mb-1 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> RICE 排優先</div>
            <p>Reach × Impact × Confidence ÷ Effort = 分數。同等效益優先做 effort 小的。</p>
          </div>
          <div>
            <div className="font-bold text-fg mb-1 flex items-center gap-2"><Repeat className="w-4 h-4" /> 內容再利用</div>
            <p>一篇長文 → 切 5 個 IG carousel → 3 個 X 串 → 1 個 newsletter → 10 個 hashtag → 多個 reels。</p>
          </div>
          <div>
            <div className="font-bold text-fg mb-1 flex items-center gap-2"><Target className="w-4 h-4" /> ICP 鎖定</div>
            <p>Ideal Customer Profile：年齡 / 城市 / 痛點 / 看哪些媒體 / 用哪些社群。每個 campaign 都先確認 ICP。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
