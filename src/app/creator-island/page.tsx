import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { getOrCreatePersonalWorkspace } from "@/lib/creator-engine/workspace";
import { listFragments } from "@/lib/creator-engine/fragments";
import { CreatorIslandClient } from "./CreatorIslandClient";

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

  // 3) 首次進來 lazy-create Personal Workspace（+ E2 種島）
  const personal = await getOrCreatePersonalWorkspace(user.id);
  const { items: fragments } = await listFragments(personal.id, { limit: 50 });

  // 4) 創作者島嶼主畫面（M3）
  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">🎨 創作者島嶼</h1>
          <p className="text-sm text-fg-muted mt-1">把散落的碎片，變成你的創作宇宙。</p>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/creator-island/works" className="text-fg-muted hover:text-accent">📚 作品庫</Link>
          <Link href="/creator-island/studio" className="text-fg-muted hover:text-accent">🏢 工作室</Link>
          <span className="text-xs text-fg-muted">·&nbsp;{personal.name}</span>
        </nav>
      </header>

      {/* 創作循環：捕捉 → 凝聚/演化/編織 → 存 */}
      <CreatorIslandClient workspaceId={personal.id} initialFragments={fragments as any} />
    </div>
  );
}
