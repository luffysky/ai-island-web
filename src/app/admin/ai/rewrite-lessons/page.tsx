import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { PageHero } from "@/components/admin/PageHero";
import { RewriteClient } from "./RewriteClient";

export const dynamic = "force-dynamic";

const TARGET_CHAPTERS = [28, 29, 30];
const MIN_LEN = 50;

export default async function RewriteLessonsPage() {
  const admin = createSupabaseAdmin();
  const { data: lessons } = await admin
    .from("lessons")
    .select("id, chapter_id, number, title, analogy")
    .in("chapter_id", TARGET_CHAPTERS)
    .order("chapter_id", { ascending: true })
    .order("sort_order", { ascending: true });

  const byChapter: Record<number, { total: number; needs: number; samples: any[] }> = {};
  for (const id of TARGET_CHAPTERS) byChapter[id] = { total: 0, needs: 0, samples: [] };
  for (const l of (lessons ?? []) as any[]) {
    const s = byChapter[l.chapter_id];
    if (!s) continue;
    s.total++;
    const len = (l.analogy ?? "").length;
    if (len < MIN_LEN) {
      s.needs++;
      if (s.samples.length < 3) {
        s.samples.push({ id: l.id, title: l.title, analogy: l.analogy, len });
      }
    }
  }

  return (
    <div className="space-y-6">
      <PageHero
        emoji="✍️"
        title="批次改寫短 Analogy（ch28/29/30）"
        desc={`用 Claude Sonnet 4.6 把 analogy < ${MIN_LEN} 字 的 lesson 擴寫成 80-150 字日常類比版本。先 dry-run 看 sample、確認 OK 再 apply 寫進 DB。`}
        gradient="from-fuchsia-500/10 via-purple-500/10 to-pink-500/10"
        borderColor="border-fuchsia-500/30"
      />

      <div className="grid md:grid-cols-3 gap-4">
        {TARGET_CHAPTERS.map((cid) => {
          const s = byChapter[cid];
          const pct = s.total > 0 ? Math.round(((s.total - s.needs) / s.total) * 100) : 100;
          const ok = pct >= 95;
          return (
            <div key={cid} className={`border rounded-xl p-5 ${ok ? "bg-green-500/10 border-green-500/30" : "bg-yellow-500/10 border-yellow-500/30"}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-fg">Ch{cid}</div>
                <div className={`text-2xl font-bold ${ok ? "text-green-400" : "text-yellow-400"}`}>{pct}%</div>
              </div>
              <div className="text-sm text-fg-mid mb-3">
                {s.total - s.needs} / {s.total} 已友善化 · 還缺 {s.needs}
              </div>
              {s.samples.length > 0 && (
                <details className="text-xs text-fg-mid">
                  <summary className="cursor-pointer hover:text-fg">看缺的 sample</summary>
                  <ul className="mt-2 space-y-1">
                    {s.samples.map((x) => (
                      <li key={x.id}>
                        <span className="font-mono text-accent">{x.id}</span> · {x.title}
                        <div className="text-fg-dim">({x.len} 字)「{x.analogy || "(none)"}」</div>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          );
        })}
      </div>

      <RewriteClient targetChapters={TARGET_CHAPTERS} />

      <div className="bg-bg-soft border border-border rounded-xl p-5 text-sm space-y-2">
        <div className="font-bold text-fg">📖 怎麼用</div>
        <ul className="space-y-1 list-disc pl-5 text-fg-mid">
          <li><b>第一次：</b>先按「🔍 dry-run sample (3 個)」看 AI 改成什麼樣、確認方向對</li>
          <li><b>OK 了：</b>按「✍️ apply：跑 3 章全部」、會走線上 anthropic key、約 ~$0.05 / 75 lesson</li>
          <li><b>不滿意某個：</b>到 /admin/ai/conversations 看 raw prompt、調 prompt 重跑</li>
          <li><b>安全：</b>只改 lessons.analogy 欄位、不動 content / title、改錯可從 git history 還原</li>
        </ul>
      </div>
    </div>
  );
}
