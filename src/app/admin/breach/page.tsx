import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

export default async function BreachPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const { data: incidents } = await supabase
    .from("breach_incidents_urgent")
    .select("*")
    .limit(50);

  return (
    <div className="space-y-4">
      <PageHero
        emoji="🚨"
        title="個資外洩通報管理"
        desc="依個資法、發現外洩 72 小時內必須通報主管機關並通知當事人。逾期 dashboard 會紅色提醒。"
        gradient="from-red-500/10 via-orange-500/10 to-yellow-500/10"
        borderColor="border-red-500/40"
      >
        <Link
          href="./breach/new"
          className="px-4 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition text-xs"
        >
          + 通報新事件
        </Link>
      </PageHero>

      {/* 緊急提醒 */}
      {incidents && incidents.some((i: any) => i.time_status === "overdue") && (
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border-2 border-red-500">
          <h3 className="font-bold text-red-500">⚠️ 有逾期未通報的事件</h3>
          <p className="text-sm mt-1">
            根據個資法、發現外洩 72 小時內須通報。請立即處理。
          </p>
        </div>
      )}

      {/* 進行中的事件 */}
      <section className="mb-8">
        <h2 className="text-lg font-bold mb-3">進行中的事件</h2>
        {!incidents || incidents.length === 0 ? (
          <div className="p-8 text-center text-fg-muted bg-bg-card rounded-lg border border-border">
            ✅ 目前沒有未處理的外洩事件
          </div>
        ) : (
          <div className="space-y-3">
            {incidents.map((inc: any) => (
              <div
                key={inc.id}
                className={`p-4 rounded-lg border-2 bg-bg-card ${
                  inc.time_status === "overdue" ? "border-red-500" :
                  inc.time_status === "urgent" ? "border-yellow-500" :
                  "border-border"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        inc.severity === "critical" ? "bg-red-500 text-white" :
                        inc.severity === "high" ? "bg-orange-500 text-white" :
                        inc.severity === "medium" ? "bg-yellow-500 text-black" :
                        "bg-gray-500 text-white"
                      }`}>
                        {inc.severity.toUpperCase()}
                      </span>
                      <span className="text-xs text-fg-muted">
                        #{inc.id} · {inc.incident_type}
                      </span>
                      {inc.time_status === "overdue" && (
                        <span className="px-2 py-0.5 text-xs rounded bg-red-500 text-white">
                          ⚠️ 已逾期
                        </span>
                      )}
                      {inc.time_status === "urgent" && (
                        <span className="px-2 py-0.5 text-xs rounded bg-yellow-500 text-black">
                          ⏰ 急（{Math.floor(72 - inc.hours_since_discovered)} 小時內須通報）
                        </span>
                      )}
                    </div>
                    <p className="text-sm mb-2">{inc.description}</p>
                    <div className="text-xs text-fg-muted flex gap-4">
                      <span>發現於：{new Date(inc.discovered_at).toLocaleString("zh-TW")}</span>
                      <span>影響 {inc.affected_user_count ?? "?"} 用戶</span>
                      <span>已過 {Math.floor(inc.hours_since_discovered)} 小時</span>
                    </div>
                  </div>
                  <Link
                    href={`./breach/${inc.id}` as any}
                    className="text-accent text-sm hover:underline shrink-0"
                  >
                    處理 →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SOP 速查 */}
      <section className="p-5 rounded-lg bg-bg-card border border-border">
        <h2 className="text-lg font-bold mb-3">📋 外洩應變 SOP</h2>
        <ol className="space-y-2 text-sm">
          <li><strong>1. 圍堵（0-1 小時）</strong>：立即停止資料外流、修補漏洞</li>
          <li><strong>2. 評估（1-24 小時）</strong>：確認影響範圍、受影響用戶、外洩資料類型</li>
          <li><strong>3. 通報主管機關（24-72 小時）</strong>：個資保護委員會 / 各目的事業主管機關</li>
          <li><strong>4. 通知當事人（72 小時內）</strong>：Email + 站內通知、說明：發生什麼、影響為何、如何補救</li>
          <li><strong>5. 後續</strong>：根本原因分析、補救措施、強化監控</li>
        </ol>
        <div className="mt-4 pt-4 border-t border-border text-xs">
          <p className="text-fg-muted">
            <strong>主管機關</strong>：個人資料保護委員會（pdpc.gov.tw）·
            電話：02-3356-8015
          </p>
        </div>
      </section>
    </div>
  );
}
