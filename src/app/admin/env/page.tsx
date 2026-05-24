import { Check, X, Lock, Globe } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * 環境變數面板 — read-only mask
 *
 * 規則：
 * - PUBLIC（NEXT_PUBLIC_*）：顯示完整值（本來就會被 ship 到瀏覽器）
 * - SERVER SECRET：只顯示「已設 ✓ / 未設 ✗」、value 永遠不外漏
 */

type EnvEntry = {
  key: string;
  description?: string;
  required?: boolean;
};

type EnvGroup = {
  title: string;
  emoji: string;
  vars: EnvEntry[];
};

// 公開變數（NEXT_PUBLIC_* 一定 ship 到瀏覽器、顯示完整值 OK）
const PUBLIC_GROUPS: EnvGroup[] = [
  {
    title: "公開變數（已 ship 瀏覽器、顯示完整）",
    emoji: "🌐",
    vars: [
      { key: "NEXT_PUBLIC_SITE_URL", description: "站台正式 URL（沒設用 vercel domain）", required: true },
      { key: "NEXT_PUBLIC_SUPABASE_URL", description: "Supabase 專案 REST endpoint", required: true },
      { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", description: "Supabase anon key（受 RLS 保護、可公開）", required: true },
      { key: "NEXT_PUBLIC_ADMIN_SLUG", description: "後台 URL 前綴（亂數、避免被掃）", required: true },
      { key: "NEXT_PUBLIC_GA_ID", description: "GA4 measurement ID（G-XXXXX）" },
      { key: "NEXT_PUBLIC_LINE_CHANNEL_ID", description: "LINE Login channel ID" },
      { key: "NEXT_PUBLIC_CONTENT_SOURCE", description: "章節載入來源切換（db / file）" },
      { key: "NEXT_PUBLIC_SENTRY_DSN", description: "Sentry 前端追蹤（選填）" },
    ],
  },
];

// Server secret（用 helper 不曝露 value）
const SECRET_GROUPS: EnvGroup[] = [
  {
    title: "Supabase / 核心",
    emoji: "🗄️",
    vars: [
      { key: "SUPABASE_SERVICE_ROLE_KEY", description: "Service role、繞 RLS（伺服器專用）", required: true },
      { key: "AI_KEY_SECRET", description: "DB AES-256 加密 user AI key 的 master secret", required: true },
      { key: "CRON_SECRET", description: "外部 cron 觸發 KPI / 報表 / GA4 同步" },
      { key: "ADMIN_SLUG", description: "後台路徑（middleware）、覆寫 NEXT_PUBLIC_ADMIN_SLUG" },
    ],
  },
  {
    title: "AI Provider Keys（system）",
    emoji: "🤖",
    vars: [
      { key: "ANTHROPIC_API_KEY", description: "Claude provider system fallback" },
      { key: "OPENAI_API_KEY", description: "OpenAI provider system fallback" },
      { key: "GOOGLE_AI_API_KEY", description: "Gemini provider system fallback" },
      { key: "GROQ_API_KEY", description: "Groq provider system fallback" },
    ],
  },
  {
    title: "Email / 通知",
    emoji: "📧",
    vars: [
      { key: "RESEND_API_KEY", description: "Resend email service" },
      { key: "EMAIL_FROM", description: "寄件人 email（need DKIM 設定）" },
    ],
  },
  {
    title: "LINE bot / 通知",
    emoji: "💚",
    vars: [
      { key: "ADMIN_LINE_USER_ID", description: "主 admin LINE userId" },
      { key: "ADMIN_LINE_USERS", description: "Multi-admin JSON: [{ userId, label, role }]" },
      { key: "ADMIN_LINE_USER_LABEL", description: "顯示名（optional）" },
      { key: "ADMIN_LINE_USER_ROLE", description: "角色（owner / admin）" },
      { key: "ADMIN_LINE_CHANNEL_TOKEN", description: "Messaging API channel access token" },
      { key: "ADMIN_LINE_CHANNEL_SECRET", description: "Messaging API channel secret" },
      { key: "ADMIN_LINE_NOTIFY_TOKEN", description: "舊版 LINE Notify (deprecated 2025-03)" },
      { key: "LINE_CHANNEL_SECRET", description: "LINE Login channel secret（user 端綁定）" },
      { key: "RICH_MENU_IMAGE_URL", description: "Rich Menu PNG 圖網址（2500×1686）" },
    ],
  },
  {
    title: "Telegram / Discord 通知",
    emoji: "📡",
    vars: [
      { key: "ADMIN_TELEGRAM_BOT_TOKEN", description: "選填" },
      { key: "ADMIN_TELEGRAM_CHAT_ID", description: "選填" },
      { key: "ADMIN_DISCORD_WEBHOOK_URL", description: "選填" },
      { key: "ADMIN_NOTIFY_ALL", description: "通知到所有 admin（'1' = on）" },
    ],
  },
  {
    title: "Geo / GA4 / 第三方",
    emoji: "🌏",
    vars: [
      { key: "IPINFO_TOKEN", description: "訪客 IP → 城市 / ISP 反查" },
      { key: "GOOGLE_MAPS_API_KEY", description: "精準 GPS 反查台灣縣市（選填）" },
      { key: "GA4_PROPERTY_ID", description: "GA4 屬性 ID（report API）" },
      { key: "GA4_SA_CREDENTIALS", description: "Service Account JSON（base64 或原文）" },
      { key: "LEETCODE_STATS_URL", description: "Leetcode stats API（fork 自架 url）" },
    ],
  },
];

function status(key: string): "set" | "unset" {
  return process.env[key] ? "set" : "unset";
}

function publicValue(key: string): string | undefined {
  // 公開變數可以顯示，但 anon-key 太長、視覺處理
  const v = process.env[key];
  if (!v) return undefined;
  if (key === "NEXT_PUBLIC_SUPABASE_ANON_KEY" && v.length > 24) {
    return `${v.slice(0, 12)}…${v.slice(-8)}（jwt）`;
  }
  return v;
}

export default function AdminEnvPage() {
  const totalSecret = SECRET_GROUPS.flatMap((g) => g.vars).length;
  const setSecret = SECRET_GROUPS.flatMap((g) => g.vars).filter((v) => status(v.key) === "set").length;
  const missingRequired = SECRET_GROUPS.flatMap((g) => g.vars).filter((v) => v.required && status(v.key) === "unset");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">🔐 環境變數面板</h1>
        <p className="text-sm text-fg-muted mt-1 leading-relaxed">
          所有 ENV 一覽。Server secret 只顯示「已設 / 未設」、永不外漏值。
          <br />
          這頁用來：(1) 排查線上問題時確認 ENV 有沒有設、(2) 部署新環境時對照清單。
        </p>
      </header>

      {/* 概覽 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Secret 設定率" value={`${setSecret} / ${totalSecret}`} tone={missingRequired.length === 0 ? "accent" : "warning"} />
        <Stat label="必要項缺漏" value={String(missingRequired.length)} tone={missingRequired.length === 0 ? "accent" : "danger"} />
        <Stat label="NODE_ENV" value={process.env.NODE_ENV ?? "—"} />
        <Stat label="VERCEL_ENV" value={process.env.VERCEL_ENV ?? process.env.VERCEL ?? "—"} />
      </div>

      {/* 必要項缺漏警示 */}
      {missingRequired.length > 0 && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4">
          <div className="font-bold text-red-400 mb-2 flex items-center gap-2">⚠️ 必要項缺漏</div>
          <ul className="space-y-1 text-sm">
            {missingRequired.map((v) => (
              <li key={v.key}>
                <code className="text-red-300 font-mono">{v.key}</code>
                {v.description && <span className="text-fg-muted text-xs ml-2">— {v.description}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 公開變數 */}
      {PUBLIC_GROUPS.map((g) => (
        <Section key={g.title} group={g}>
          {g.vars.map((v) => {
            const val = publicValue(v.key);
            return (
              <Row key={v.key} entry={v}>
                {val ? (
                  <code className="font-mono text-[11px] text-fg break-all">{val}</code>
                ) : (
                  <span className="text-xs text-fg-muted italic">未設定</span>
                )}
              </Row>
            );
          })}
        </Section>
      ))}

      {/* Server secret */}
      {SECRET_GROUPS.map((g) => (
        <Section key={g.title} group={g}>
          {g.vars.map((v) => {
            const s = status(v.key);
            return (
              <Row key={v.key} entry={v}>
                {s === "set" ? (
                  <span className="inline-flex items-center gap-1 text-xs text-green-400">
                    <Check size={12} /> 已設定
                    <Lock size={10} className="text-fg-muted ml-1" />
                    <span className="text-fg-muted text-[10px]">值已 mask</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
                    <X size={12} /> 未設定
                  </span>
                )}
              </Row>
            );
          })}
        </Section>
      ))}

      <p className="text-[11px] text-fg-muted leading-relaxed">
        🛡️ <b>安全</b>：本頁僅 admin 可看（middleware 已強制驗 role）。Server secret 永不從 server 送回 client、
        value 不會出現在 HTML / API response / 瀏覽器 DevTools。
      </p>
    </div>
  );
}

function Section({ group, children }: { group: EnvGroup; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-bg-card border border-border">
      <header className="px-4 py-3 border-b border-border flex items-center gap-2">
        <span className="text-lg">{group.emoji}</span>
        <h2 className="font-bold text-sm">{group.title}</h2>
      </header>
      <ul className="divide-y divide-border">{children}</ul>
    </section>
  );
}

function Row({ entry, children }: { entry: EnvEntry; children: React.ReactNode }) {
  return (
    <li className="px-4 py-3 flex items-start gap-3 flex-wrap">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <code className="font-mono text-xs text-accent break-all">{entry.key}</code>
          {entry.required && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-warning/20 text-warning font-bold">必要</span>
          )}
        </div>
        {entry.description && <div className="text-[11px] text-fg-muted mt-0.5 leading-snug">{entry.description}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </li>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "accent" | "warning" | "danger" }) {
  const color =
    tone === "accent"
      ? "text-accent"
      : tone === "warning"
      ? "text-warning"
      : tone === "danger"
      ? "text-red-400"
      : "text-fg";
  return (
    <div className="rounded-xl bg-bg-card border border-border p-4">
      <div className="text-xs text-fg-muted">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}
