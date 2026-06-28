import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { getActiveWorkspace } from "@/lib/creator-engine/workspace";
import { listWorks } from "@/lib/creator-engine/works";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = { draft: "草稿", in_progress: "進行中", done: "完成", archived: "已封存" };
const TYPE_LABEL: Record<string, string> = { article: "文章", song: "歌曲", story: "故事", script: "腳本", product_plan: "產品企劃", course: "課程", worldbuilding: "世界觀", other: "其他" };

export default async function WorksPage() {
  if (!(await isCreatorIslandEnabled())) return <FeatureOffNotice title="🎨 創作者島嶼即將開放" />;
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/creator-island/works");
  const ws = await getActiveWorkspace(user.id);
  const { items } = await listWorks(ws.id, { limit: 50 });
  // 每個作品由幾個碎片長成
  const { createSupabaseAdmin } = await import("@/lib/supabase-admin");
  const admin = createSupabaseAdmin();
  const ids = items.map((w) => w.id);
  const srcCount: Record<string, number> = {};
  if (ids.length) {
    const { data: wf } = await admin.from("ci_work_fragments").select("work_id").in("work_id", ids);
    for (const r of ((wf as any[]) ?? [])) srcCount[r.work_id] = (srcCount[r.work_id] ?? 0) + 1;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">📚 作品庫</h1>
        <Link href="/creator-island" className="text-sm text-accent hover:underline">← 回島</Link>
      </header>
      {items.length === 0 && <div className="text-center text-fg-muted py-12 text-sm">還沒有作品。回島上把碎片「編織」成作品吧。</div>}
      <div className="space-y-2">
        {items.map((w) => (
          <Link key={w.id} href={`/creator-island/works/${w.id}`} className="block bg-bg-card border border-border rounded-xl p-4 hover:border-accent transition">
            <div className="font-bold flex items-center gap-2">
              {w.title}
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-300">{TYPE_LABEL[w.work_type] ?? w.work_type}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-fg-muted">{STATUS_LABEL[w.status] ?? w.status}</span>
              {w.published_blog_id && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">已發布</span>}
            </div>
            <div className="text-xs text-fg-muted mt-1 line-clamp-2">{w.body?.slice(0, 120)}</div>
            {srcCount[w.id] > 0 && <div className="text-[11px] text-accent-3 mt-1.5">🔗 由 {srcCount[w.id]} 個碎片長成</div>}
          </Link>
        ))}
      </div>
    </div>
  );
}
