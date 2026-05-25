import Link from "next/link";
import { adminHref } from "@/lib/admin-href";

export default function PublishPage() {
  const platforms = [
    { key: "facebook", name: "Facebook Page", emoji: "📘", env: "FB_PAGE_ACCESS_TOKEN", doc: "https://developers.facebook.com/docs/pages-api", note: "需要 FB App + Page admin" },
    { key: "instagram", name: "Instagram Business", emoji: "📷", env: "IG_BUSINESS_ID + FB_PAGE_ACCESS_TOKEN", doc: "https://developers.facebook.com/docs/instagram-api", note: "走 FB Graph API、IG 帳號要轉成 Business" },
    { key: "x", name: "X (Twitter)", emoji: "🐦", env: "X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN", doc: "https://developer.twitter.com/en/docs/twitter-api", note: "v2 API、free tier 限制嚴" },
    { key: "threads", name: "Threads", emoji: "🧵", env: "THREADS_ACCESS_TOKEN", doc: "https://developers.facebook.com/docs/threads", note: "Meta Threads API、跟 IG 共用" },
    { key: "linkedin", name: "LinkedIn", emoji: "💼", env: "LINKEDIN_ACCESS_TOKEN", doc: "https://learn.microsoft.com/en-us/linkedin/marketing/", note: "公司頁 / 個人發文" },
    { key: "line", name: "LINE Official Account", emoji: "💚", env: "ADMIN_LINE_CHANNEL_TOKEN ✅", doc: "/admin/line/broadcast", note: "已配好、直接用群發" },
    { key: "blog", name: "站內部落格", emoji: "📰", env: "✅ 內建", doc: "/admin/blog (待建)", note: "AI 寫 + 一鍵發到 /blogs" },
    { key: "email", name: "Email Newsletter", emoji: "📧", env: "RESEND_API_KEY ✅", doc: "/admin/email/campaigns", note: "已配好、用 Email Campaigns" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">📤 多平台一鍵發佈</h1>
        <p className="text-xs text-fg-muted mt-1 leading-relaxed">
          排程到期或手動觸發、把同一草稿一次推到多平台。各平台需要先設好 OAuth / API token。
          已配好的可立即用、未配好的會顯示「需要設定環境變數」。
        </p>
      </div>

      <div className="bg-yellow-500/5 border border-yellow-500/30 rounded-2xl p-4 text-xs leading-relaxed">
        <div className="font-bold text-yellow-300 mb-2">⚠️ 一鍵發佈現狀 / 接 OAuth 路線圖</div>
        <p className="text-fg-muted">
          目前完整可用：<span className="text-emerald-400 font-bold">LINE OA 群發、Email Campaigns、站內公告</span>。
          <br />
          Facebook / IG / X / Threads / LinkedIn 需要先註冊 developer app + OAuth 流程、token 寫到環境變數後本頁會自動切換成「✅ 可發佈」。
          這部分屬於 BD / 法規工作 (FB 要審核、X v2 要付費 tier)、建議先用 LINE + Email + Blog 三大內部通路、外部社群手動複製貼上即可。
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {platforms.map((p) => (
          <div key={p.key} className="bg-bg-card border border-border rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-2xl">{p.emoji}</span>
              <h3 className="font-bold text-sm">{p.name}</h3>
              {p.env.includes("✅") && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">已配</span>}
            </div>
            <div className="text-[11px] text-fg-muted">{p.note}</div>
            <div className="text-[10px] text-fg-muted/70 mt-1 font-mono break-all">env: {p.env}</div>
            <a href={p.doc} target="_blank" rel="noopener noreferrer" className="text-[10px] text-accent hover:underline mt-1 inline-block">
              {p.doc.startsWith("http") ? "→ 開發文件" : "→ 內部入口"}
            </a>
          </div>
        ))}
      </div>

      <Link
        href={adminHref("/admin/marketing/schedule") as any}
        className="inline-block px-4 py-2 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 text-sm"
      >
        ← 回排程列表
      </Link>
    </div>
  );
}
