import { PageHero } from "@/components/admin/PageHero";
import { TelegramSetupButton } from "./TelegramSetupButton";

export const dynamic = "force-dynamic";

export default function AdminTelegramPage() {
  const hasToken = !!process.env.ADMIN_TELEGRAM_BOT_TOKEN;
  const hasSecret = !!process.env.TELEGRAM_WEBHOOK_SECRET;

  return (
    <div>
      <PageHero
        emoji="📨"
        title="Telegram Bot 設定"
        desc="一鍵把 admin Telegram bot 的 webhook 指到本站 + 註冊命令選單。改了 BOT_COMMANDS 或換 domain 後重按一次即可。"
        gradient="from-sky-500/10 via-blue-500/10 to-cyan-500/10"
        borderColor="border-sky-500/30"
      />

      {/* 環境檢查 */}
      <section className="rounded-xl bg-bg-card border border-border p-4 mb-6">
        <h2 className="font-bold text-sm mb-3">環境變數檢查</h2>
        <div className="space-y-2 text-sm">
          <EnvRow
            label="ADMIN_TELEGRAM_BOT_TOKEN"
            ok={hasToken}
            okText="已設定"
            badText="未設定 — 先去 @BotFather 拿 token 設進 env"
          />
          <EnvRow
            label="TELEGRAM_WEBHOOK_SECRET"
            ok={hasSecret}
            okText="已設定（webhook 會驗 secret、安全）"
            badText="未設定 — webhook 目前 fail-closed 會擋掉所有訊息，請先設 env 再按下方按鈕"
          />
        </div>
      </section>

      {/* 操作 */}
      <section className="rounded-xl bg-bg-card border border-border p-4">
        <h2 className="font-bold text-sm mb-1">設定 Webhook</h2>
        <p className="text-xs text-fg-muted mb-4">
          按下後會呼叫 Telegram 的 setWebhook + setMyCommands。<b>順序提醒</b>：要先設好上面兩個 env（線上記得在 Zeabur 設、不只 .env.local）並重新部署，再按這顆，secret 才會一起註冊上去。
        </p>
        <TelegramSetupButton />
      </section>
    </div>
  );
}

function EnvRow({ label, ok, okText, badText }: { label: string; ok: boolean; okText: string; badText: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className={`mt-0.5 shrink-0 ${ok ? "text-emerald-400" : "text-amber-400"}`}>{ok ? "✅" : "⚠️"}</span>
      <div>
        <code className="text-fg">{label}</code>
        <span className="text-fg-muted"> — {ok ? okText : badText}</span>
      </div>
    </div>
  );
}
