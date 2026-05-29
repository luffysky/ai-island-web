import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

export default async function DiscordConsole() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role, is_owner").eq("id", user.id).maybeSingle();
  if (!["admin", "owner"].includes((profile as any)?.role ?? "") && !(profile as any)?.is_owner) {
    redirect("/admin");
  }

  const admin = createSupabaseAdmin();
  const [{ count: bound }, { count: subActive }, { data: recent }] = await Promise.all([
    admin.from("user_discord_bind").select("user_id", { count: "exact", head: true }),
    admin.from("subscriptions").select("user_id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("user_discord_bind").select("discord_username, discord_user_id, bound_at, last_role_sync_at").order("bound_at", { ascending: false }).limit(20),
  ] as any);

  const envChecklist = [
    { key: "DISCORD_APPLICATION_ID", desc: "Bot application id", required: true },
    { key: "DISCORD_BOT_TOKEN", desc: "Bot token（操作 guild / DM / role）", required: true },
    { key: "DISCORD_PUBLIC_KEY", desc: "Interactions 驗 sig", required: true },
    { key: "DISCORD_CLIENT_SECRET", desc: "OAuth 學員綁定用", required: true },
    { key: "DISCORD_GUILD_ID", desc: "主伺服器 ID", required: true },
    { key: "DISCORD_VIP_ROLE_ID", desc: "Premium VIP role", required: true },
    { key: "DISCORD_OWNER_USER_IDS", desc: "Admin 白名單", required: false },
  ];

  return (
    <div className="space-y-4">
      <PageHero
        emoji="🟣"
        title="Discord 控制台"
        desc="一鍵註冊 slash command、role 同步、綁定統計、新人 onboarding。"
        gradient="from-indigo-500/10 via-purple-500/10 to-pink-500/10"
        borderColor="border-indigo-500/30"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card title="已綁 Discord" value={bound ?? 0} hint="user_discord_bind" />
        <Card title="active premium" value={subActive ?? 0} hint="可拿 VIP role 的人" />
        <Card title="role coverage" value={`${bound && subActive ? Math.min(100, Math.round((bound / Math.max(subActive, 1)) * 100)) : 0}%`} hint="bound / active" />
      </div>

      {/* Actions */}
      <section className="bg-bg-card border border-border rounded-xl p-4 space-y-3">
        <h2 className="font-bold flex items-center gap-2">⚡ 一鍵動作</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Action
            title="🛠️ 註冊 / 更新 slash commands"
            desc="把最新的 11 條 slash command (含 /quote /recommend /vision /bind) 推到 Discord。改過 commands 後跑一次。"
            href="/api/admin/discord/setup"
          />
          <Action
            title="🔁 一鍵 sync 全 VIP role"
            desc="掃所有已綁 user × active subscription、自動 assign / revoke Premium role。每天 cron 也可以叫。"
            href="/api/admin/discord/sync-roles"
          />
        </div>
      </section>

      {/* Env check */}
      <section className="bg-bg-card border border-border rounded-xl p-4">
        <h2 className="font-bold mb-3">🔑 必要 env</h2>
        <ul className="space-y-1 text-sm">
          {envChecklist.map((e) => (
            <li key={e.key} className="flex items-center gap-2">
              <code className="text-xs bg-bg-elevated px-2 py-0.5 rounded">{e.key}</code>
              <span className="text-fg-muted text-xs">{e.desc}</span>
              {!e.required && <span className="text-[10px] text-fg-muted">（可選）</span>}
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-fg-muted mt-3">
          在 Zeabur project Variables 填齊、redeploy 後生效。沒設的 endpoint 會無感降級、不會炸。
        </p>
      </section>

      {/* 最近綁定 */}
      <section className="bg-bg-card border border-border rounded-xl p-4">
        <h2 className="font-bold mb-3">🆕 最近綁定（20）</h2>
        {((recent ?? []) as any[]).length === 0 ? (
          <p className="text-sm text-fg-muted">還沒有人綁 Discord。叫朋友去 /me/settings 試一輪。</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-fg-muted">
              <tr>
                <th className="text-left py-1">Discord</th>
                <th className="text-left py-1">綁定時間</th>
                <th className="text-left py-1">role sync</th>
              </tr>
            </thead>
            <tbody>
              {((recent ?? []) as any[]).map((r) => (
                <tr key={r.discord_user_id} className="border-t border-border">
                  <td className="py-1">@{r.discord_username ?? "(unknown)"}</td>
                  <td className="py-1">{new Date(r.bound_at).toLocaleString("zh-TW")}</td>
                  <td className="py-1">{r.last_role_sync_at ? new Date(r.last_role_sync_at).toLocaleDateString("zh-TW") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Card({ title, value, hint }: { title: string; value: number | string; hint: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-card p-4">
      <div className="text-xs text-fg-muted">{title}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
      <div className="text-[10px] text-fg-muted mt-1">{hint}</div>
    </div>
  );
}

function Action({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="block rounded-xl border border-border bg-bg p-3 hover:border-accent transition"
    >
      <div className="font-bold text-sm">{title}</div>
      <p className="text-xs text-fg-muted mt-1">{desc}</p>
      <span className="text-[10px] text-accent mt-2 inline-block">→ 開新分頁執行</span>
    </a>
  );
}
