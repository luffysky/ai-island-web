import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, StickyNote, Bookmark, Code2, History, Award, PenLine } from "lucide-react";

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, xp, level, z_coin, streak_days, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="flex gap-6">
        {/* 側欄 */}
        <aside className="w-56 flex-shrink-0">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} className="w-12 h-12 rounded-full" alt="" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[var(--color-accent)] flex items-center justify-center text-black font-bold text-lg">
                  {profile?.display_name?.[0] || profile?.username?.[0] || "?"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-bold truncate">{profile?.display_name || profile?.username}</div>
                <div className="text-xs text-[var(--color-fg-muted)]">Lv {profile?.level ?? 1} · {profile?.xp ?? 0} XP</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-[var(--color-bg)] rounded p-2">
                <div className="text-yellow-400 font-bold">🪙 {profile?.z_coin ?? 0}</div>
                <div className="text-[var(--color-fg-muted)]">Z-coin</div>
              </div>
              <div className="bg-[var(--color-bg)] rounded p-2">
                <div className="text-orange-400 font-bold">🔥 {profile?.streak_days ?? 0}</div>
                <div className="text-[var(--color-fg-muted)]">連續天</div>
              </div>
            </div>
          </div>

          <nav className="space-y-0.5 text-sm">
            <MeLink href="/me" icon={<LayoutDashboard size={16} />}>學習總覽</MeLink>
            <MeLink href="/me/notes" icon={<StickyNote size={16} />}>我的筆記</MeLink>
            <MeLink href="/me/bookmarks" icon={<Bookmark size={16} />}>我的書籤</MeLink>
            <MeLink href="/me/playgrounds" icon={<Code2 size={16} />}>我的程式碼</MeLink>
            <MeLink href="/me/blog" icon={<PenLine size={16} />}>我的部落格</MeLink>
            <MeLink href="/me/history" icon={<History size={16} />}>學習紀錄</MeLink>
            <MeLink href="/me/certificates" icon={<Award size={16} />}>證書</MeLink>
          </nav>

          <div className="mt-4 pt-4 border-t border-[var(--color-border)] space-y-0.5 text-sm">
            <MeLink href="/profile">👤 個人檔案</MeLink>
            <MeLink href="/settings">⚙️ 設定</MeLink>
          </div>
        </aside>

        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

function MeLink({ href, icon, children }: { href: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link href={href as any} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--color-bg-card)] hover:text-[var(--color-accent)] transition">
      {icon}
      <span>{children}</span>
    </Link>
  );
}
