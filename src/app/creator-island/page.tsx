import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { getOrCreatePersonalWorkspace } from "@/lib/creator-engine/workspace";
import { listFragments } from "@/lib/creator-engine/fragments";
import { listCollectionsWithItems } from "@/lib/creator-engine/collections";
import { BackgroundBeams } from "@/components/ui/BackgroundBeams";
import { Sparkles } from "@/components/ui/Sparkles";
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
  const [{ items: fragments }, collections] = await Promise.all([
    listFragments(personal.id, { limit: 100 }),
    listCollectionsWithItems(personal.id),
  ]);

  // 4) 創作者島嶼主畫面（M3）
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/10 via-violet-500/10 to-pink-500/10 p-6">
        <BackgroundBeams className="opacity-40" />
        <Sparkles count={14} />
        <div className="relative flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-amber-300 via-pink-400 to-violet-400 bg-clip-text text-transparent">🎨 創作者島嶼</h1>
            <p className="text-sm text-fg-muted mt-1.5">把散落的碎片，變成你的創作宇宙。綠寶 ✨ 陪你一起。</p>
          </div>
          <nav className="flex items-center gap-1.5 text-sm flex-wrap">
            {[["/creator-island/works", "📚 作品庫"], ["/creator-island/studio", "🏢 工作室"], ["/creator-island/market", "🏪 市集"], ["/creator-island/community", "🌐 社群"], ["/creator-island/growth", "📈 成長"]].map(([href, label]) => (
              <Link key={href} href={href} className="px-3 py-1.5 rounded-full bg-bg-card/60 border border-border/60 backdrop-blur hover:border-accent hover:text-accent transition">{label}</Link>
            ))}
          </nav>
        </div>
      </div>

      {/* 創作循環：捕捉 → 凝聚/演化/編織 → 存 */}
      <CreatorIslandClient workspaceId={personal.id} initialFragments={fragments as any} initialCollections={collections} />
    </div>
  );
}
