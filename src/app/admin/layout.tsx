import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";

// 強制每次都 server-side render、不 cache
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer();

  // 用 getUser 確保 token 有被 supabase server 驗證（不是只看 cookie）
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login?next=/admin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, username, avatar_url, display_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🛠️ AI 島 後台</h1>
          <p className="text-xs text-[var(--color-fg-muted)]">
            管理員：{profile?.display_name || profile?.username}
          </p>
        </div>
        <Link href="/" className="text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-accent)]">
          ← 回前台
        </Link>
      </div>

      <div className="flex gap-6">
        <aside className="w-52 flex-shrink-0">
          <nav className="space-y-4 text-sm">
            <NavGroup title="總覽">
              <AdminLink href="/admin">📊 Dashboard</AdminLink>
              <AdminLink href="/admin/analytics">📈 數據分析</AdminLink>
            </NavGroup>

            <NavGroup title="用戶">
              <AdminLink href="/admin/users">👥 使用者</AdminLink>
              <AdminLink href="/admin/crm">💬 客服 (CRM)</AdminLink>
              <AdminLink href="/admin/broadcasts">📣 公告 / Email</AdminLink>
            </NavGroup>

            <NavGroup title="商務 (ERP)">
              <AdminLink href="/admin/orders">💰 訂單</AdminLink>
              <AdminLink href="/admin/subscriptions">💎 訂閱</AdminLink>
              <AdminLink href="/admin/zcoin">🪙 Z-coin 流水</AdminLink>
            </NavGroup>

            <NavGroup title="AI">
              <AdminLink href="/admin/ai/models">🤖 模型管理</AdminLink>
              <AdminLink href="/admin/ai/usage">📊 Token 用量</AdminLink>
              <AdminLink href="/admin/ai/conversations">💬 對話紀錄</AdminLink>
            </NavGroup>

            <NavGroup title="SEO / 流量">
              <AdminLink href="/admin/ga4">📈 GA4 儀表板</AdminLink>
              <AdminLink href="/admin/seo">🔍 SEO 管理</AdminLink>
              <AdminLink href="/admin/seo/redirects">↪️ 轉址</AdminLink>
            </NavGroup>

            <NavGroup title="內容">
              <AdminLink href="/admin/chapters">📚 章節管理</AdminLink>
              <AdminLink href="/admin/achievements">🏆 成就管理</AdminLink>
            </NavGroup>

            <NavGroup title="系統">
              <AdminLink href="/admin/audit">📝 操作紀錄</AdminLink>
              <AdminLink href="/admin/settings">⚙️ 系統設定</AdminLink>
            </NavGroup>
          </nav>
        </aside>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

function NavGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-[var(--color-fg-muted)] uppercase tracking-wider px-3 mb-1">{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function AdminLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href as any}
      className="block px-3 py-1.5 rounded-lg hover:bg-[var(--color-bg-card)] hover:text-[var(--color-accent)] transition"
    >
      {children}
    </Link>
  );
}
