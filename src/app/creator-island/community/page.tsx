import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { myCollects } from "@/lib/creator-engine/community";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  if (!(await isCreatorIslandEnabled())) return <FeatureOffNotice title="🎨 創作者島嶼即將開放" />;
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/creator-island/community");
  const collects = await myCollects(user.id);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🌐 社群</h1>
        <Link href="/creator-island" className="text-sm text-accent hover:underline">← 回島</Link>
      </header>
      <p className="text-sm text-fg-muted">在 <Link href="/creator-island/market" className="text-accent">市集</Link> 對公開資產 👍 讚 / 🔖 收藏 / 🍴 Fork / 💬 留言。Fork 會自動把作品複製進你的工作空間並記錄家譜來源。</p>

      <div>
        <h2 className="text-sm uppercase tracking-wider text-fg-muted mb-2">🔖 我的收藏（{collects.length}）</h2>
        {collects.length === 0 && <div className="text-sm text-fg-muted">還沒有收藏。去市集逛逛、收藏喜歡的資產。</div>}
        <div className="space-y-2">
          {collects.map((c: any) => (
            <div key={c.asset_id} className="bg-bg-card border border-border rounded-xl p-3 text-sm flex items-center gap-2">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-fg-muted">{c.asset_type}</span>
              <span className="font-mono text-xs text-fg-muted">{c.asset_id.slice(0, 8)}…</span>
              <span className="ml-auto text-[10px] text-fg-muted">{new Date(c.created_at).toLocaleDateString("zh-TW")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
