import { createSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function CompetitorPage() {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("competitor_snapshots")
    .select("*")
    .order("snapshot_at", { ascending: false })
    .limit(50);

  const rows = (data as any[]) ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">🔍 競品 / 關鍵字</h1>
        <p className="text-xs text-fg-muted mt-1 leading-relaxed">
          紀錄主要競品的價格 / 功能 / 威脅程度。AI 可抓取競品網站做 snapshot + 自動摘要、定期回顧調整定位。
        </p>
      </div>

      <div className="bg-purple-500/5 border border-purple-500/30 rounded-2xl p-4 text-xs">
        <div className="font-bold text-purple-300 mb-2">📋 已記錄競品 ({rows.length})</div>
        {rows.length === 0 ? (
          <p className="text-fg-muted">
            還沒記錄任何競品。建議追蹤：
            <span className="text-fg ml-1">Hahow / Codecademy / freeCodeCamp / Codecamp / 六角學院 / W3 schools / Real Python</span>
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="bg-bg-card border border-border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm">{r.name}</span>
                  {r.threat_level && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                      r.threat_level === "direct" ? "bg-red-500/15 text-red-300 border-red-500/30" :
                      r.threat_level === "high" ? "bg-orange-500/15 text-orange-300 border-orange-500/30" :
                      r.threat_level === "medium" ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30" :
                      "bg-fg-muted/15 text-fg-muted border-fg-muted/30"
                    }`}>
                      {r.threat_level}
                    </span>
                  )}
                  {r.category && <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-elevated text-fg-muted">{r.category}</span>}
                </div>
                {r.url && <a href={r.url} target="_blank" className="text-[10px] text-accent">{r.url}</a>}
                {r.notes && <p className="text-xs text-fg-muted mt-1">{r.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-bg-elevated/40 border border-border rounded-2xl p-4 text-xs leading-relaxed text-fg-muted">
        <div className="font-bold text-fg mb-1">📐 競品分析框架</div>
        <ul className="list-disc list-inside space-y-1">
          <li><b className="text-fg">威脅分級</b>：direct (同類同價位) / high (重疊大) / medium (部分重疊) / low (擦邊)</li>
          <li><b className="text-fg">看 3 維度</b>：價格 / 內容深度 / 用戶體驗</li>
          <li><b className="text-fg">差異化</b>：我們強在 <span className="text-emerald-300">繁中台灣感 + AI 寵物陪伴 + Z-coin 經濟 + 完整 75 章</span>、不要硬碰他們的優勢</li>
          <li><b className="text-fg">週期</b>：每 2 個月跑一次 snapshot、看價格 / 新功能</li>
        </ul>
      </div>
    </div>
  );
}
