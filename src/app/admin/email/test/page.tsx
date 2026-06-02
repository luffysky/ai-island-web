import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { EmailTestForm } from "./EmailTestForm";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

export default async function AdminEmailTestPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role, display_name").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const hasResend = !!process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM || null;

  return (
    <div className="space-y-4 max-w-3xl">
      <PageHero
        emoji="🧪"
        title="Email 發送測試"
        desc="確認 Resend API key、EMAIL_FROM、DKIM 設定是否都接得通。本機 dev / Zeabur prod 都該過。"
        gradient="from-yellow-500/10 via-amber-500/10 to-orange-500/10"
        borderColor="border-yellow-500/30"
      />

      <section className="rounded-xl bg-bg-card border border-border p-4 text-sm space-y-1">
        <h2 className="font-bold flex items-center gap-2">🔍 環境狀態</h2>
        <Row label="RESEND_API_KEY">
          {hasResend ? <span className="text-green-400">✓ 已設定</span> : <span className="text-red-400">✗ 未設定</span>}
        </Row>
        <Row label="EMAIL_FROM">
          {emailFrom ? <code className="font-mono text-xs text-fg">{emailFrom}</code> : <span className="text-yellow-400 text-xs">⚠️ 沒設、用 fallback noreply@ai-island-web.snowrealm.pet</span>}
        </Row>
      </section>

      {!hasResend && (
        <section className="rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-4 text-sm space-y-2">
          <div className="font-bold text-yellow-400">⚠️ Resend 還沒接</div>
          <ol className="text-xs text-fg-muted space-y-1 list-decimal list-inside">
            <li>到 <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">resend.com</a> 註冊（GitHub login）</li>
            <li>Domains → Add Domain → 輸入 <code className="bg-bg px-1 rounded">snowrealm.pet</code></li>
            <li>Resend 會給你 3 條 DNS（SPF / DKIM / DMARC）、複製貼到你 domain 的 DNS provider</li>
            <li>等 ~10 分鐘 → Resend 驗證綠燈</li>
            <li>API Keys → Create API Key → 複製</li>
            <li>Zeabur dashboard 加：<code className="bg-bg px-1 rounded text-xs">RESEND_API_KEY</code> + <code className="bg-bg px-1 rounded text-xs">{`EMAIL_FROM="AI 島 <noreply@snowrealm.pet>"`}</code></li>
            <li>redeploy 後回這頁送測試</li>
          </ol>
        </section>
      )}

      <EmailTestForm defaultTo={user.email ?? ""} hasResend={hasResend} />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <code className="text-xs font-mono text-fg-muted">{label}</code>
      <div>{children}</div>
    </div>
  );
}
