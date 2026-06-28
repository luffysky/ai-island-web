import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { getOrCreatePersonalWorkspace, listWorkspaces } from "@/lib/creator-engine/workspace";

// 旗標 / workspace 要即時反映
export const dynamic = "force-dynamic";

export default async function CreatorIslandPage() {
  // 1) 功能旗標（預設關、owner 在 /admin/settings 開）
  if (!(await isCreatorIslandEnabled())) {
    return <FeatureOffNotice title="🎨 創作者島嶼即將開放" desc="這座島還在建造中，敬請期待。" />;
  }

  // 2) 認證
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/creator-island");

  // 3) 首次進來 lazy-create Personal Workspace
  const personal = await getOrCreatePersonalWorkspace(user.id);
  const workspaces = await listWorkspaces(user.id);

  // 4) M0：先給最小 Dashboard 殼（M3 再做完整 IA）
  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">🎨 創作者島嶼</h1>
          <p className="text-sm text-fg-muted mt-1">把散落的碎片，變成你的創作宇宙。</p>
        </div>
        <div className="text-xs text-fg-muted">
          目前工作空間：<b className="text-fg">{personal.name}</b>
        </div>
      </header>

      <section className="bg-bg-card border border-border rounded-2xl p-6">
        <h2 className="font-bold mb-2">🚧 M0 基礎已就緒</h2>
        <p className="text-sm text-fg-muted leading-relaxed">
          工作空間系統已啟用。碎片庫、創作工具（凝聚 / 演化 / 編織）、作品庫將陸續上線。
        </p>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-fg-muted mb-3">你的工作空間（{workspaces.length}）</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {workspaces.map((w) => (
            <div key={w.id} className="bg-bg-card border border-border rounded-xl p-4">
              <div className="font-bold text-sm flex items-center gap-2">
                {w.type === "personal" ? "👤" : "🏢"} {w.name}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-bg-elevated text-fg-muted">{w.role}</span>
              </div>
              <div className="text-[11px] text-fg-muted mt-1">{w.type === "personal" ? "個人工作空間" : "工作室"}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
