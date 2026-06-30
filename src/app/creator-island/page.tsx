import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { getOrCreatePersonalWorkspace, getWorkspaceById, getWorkspaceRole } from "@/lib/creator-engine/workspace";
import { listAllFragments } from "@/lib/creator-engine/fragments";
import { listCollectionsWithItems } from "@/lib/creator-engine/collections";
import { BackgroundBeams } from "@/components/ui/BackgroundBeams";
import { Sparkles } from "@/components/ui/Sparkles";
import { PenTool, Library, Building2, Store, Globe, TrendingUp, Palette } from "lucide-react";
import { CreatorIslandClient } from "./CreatorIslandClient";

const NAV = [
  { href: "/creator-island/create", label: "創作引擎", Icon: PenTool },
  { href: "/creator-island/works", label: "作品庫", Icon: Library },
  { href: "/creator-island/studio", label: "工作室", Icon: Building2 },
  { href: "/creator-island/market", label: "市集", Icon: Store },
  { href: "/creator-island/community", label: "社群", Icon: Globe },
  { href: "/creator-island/growth", label: "成長", Icon: TrendingUp },
] as const;

// 旗標 / workspace 要即時反映
export const dynamic = "force-dynamic";

export default async function CreatorIslandPage({ searchParams }: { searchParams: Promise<{ ws?: string }> }) {
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
  // 可切到自己有份的工作室（?ws=<id>）；非成員 fallback personal
  const { ws: wsParam } = await searchParams;
  let active = personal;
  if (wsParam && wsParam !== personal.id) {
    const role = await getWorkspaceRole(wsParam, user.id);
    const target = role ? await getWorkspaceById(wsParam) : null;
    if (target) active = target;
  }
  const isStudio = active.id !== personal.id;
  const [fragments, collections] = await Promise.all([
    listAllFragments(active.id),
    listCollectionsWithItems(active.id),
  ]);

  // 4) 創作者島嶼主畫面（M3）
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/10 via-violet-500/10 to-pink-500/10 p-6">
        <BackgroundBeams className="opacity-40" />
        <Sparkles count={14} />
        <div className="relative flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-amber-300 via-pink-400 to-violet-400 bg-clip-text text-transparent inline-flex items-center gap-2"><Palette className="text-pink-400" size={32} /> 創作者島嶼</h1>
            <p className="text-sm text-fg-muted mt-1.5">
              {isStudio
                ? <>🏢 工作室：<b className="text-fg">{active.name}</b> · <Link href="/creator-island" className="text-accent hover:underline">回我的島</Link></>
                : "把散落的碎片，變成你的創作宇宙。綠寶 ✨ 陪你一起。"}
            </p>
          </div>
          <nav className="flex items-center gap-1.5 text-sm flex-wrap">
            {NAV.map(({ href, label, Icon }) => (
              <Link key={href} href={href} data-tour={`nav-${href.split("/").pop()}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg-card/60 border border-border/60 backdrop-blur hover:border-accent hover:text-accent transition"><Icon size={15} /> {label}</Link>
            ))}
          </nav>
        </div>
      </div>

      {/* 創作循環：捕捉 → 凝聚/演化/編織 → 存 */}
      <CreatorIslandClient workspaceId={active.id} initialFragments={fragments as any} initialCollections={collections} />
    </div>
  );
}
