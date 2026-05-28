import { createSupabaseServer } from "@/lib/supabase-server";
import { chapters as ALL_CHAPTERS } from "@/data/chapters";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 30;

/**
 * 學習足跡頁 — 升級版 /me/history
 *
 * 內容：
 *   1. 連續簽到 + 今日狀態 banner
 *   2. 最近 30 天 lesson 完成 timeline（依日期分組）
 *   3. 章節進度卡 grid（每章學了多少 / 上次學的時間）
 *   4. 複習推薦（7/14/30/90 天前學過、現在該複習的）
 *
 * LINE bot `/footprint` 命令連到這頁。
 */
export default async function FootprintPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="p-8 text-center text-fg-muted">
        <p>登入後可以看學習足跡</p>
        <Link href="/login" className="text-accent underline">去登入</Link>
      </div>
    );
  }

  const now = Date.now();
  const day30 = new Date(now - 30 * 86400_000).toISOString();
  const day7 = new Date(now - 7 * 86400_000);
  const day14 = new Date(now - 14 * 86400_000);
  const day30Date = new Date(now - 30 * 86400_000);
  const day90 = new Date(now - 90 * 86400_000);

  const [progressRes, profileRes, weakRes] = await Promise.all([
    supabase
      .from("lesson_progress")
      .select("chapter_id, lesson_id, completed_at")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(500),
    supabase
      .from("profiles")
      .select("display_name, username, streak_days, level, xp")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_weak_chapters")
      .select("chapter_id, avg_pct, attempt_count")
      .eq("user_id", user.id)
      .order("avg_pct", { ascending: true })
      .limit(5),
  ]);

  const progress = (progressRes.data as any[]) ?? [];
  const profile = profileRes.data as any;
  const weaks = (weakRes.data as any[]) ?? [];

  // 30 天內 lesson 依日期分組
  const recent30 = progress.filter((p) => new Date(p.completed_at).toISOString() >= day30);
  const byDay = new Map<string, any[]>();
  for (const p of recent30) {
    const day = new Date(p.completed_at).toLocaleDateString("zh-TW", {
      timeZone: "Asia/Taipei",
      month: "2-digit",
      day: "2-digit",
    });
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(p);
  }

  // 章節進度：每章學了幾課 / 上次學的時間
  const byChapter = new Map<number, { count: number; lastAt: number; lessons: Set<string> }>();
  for (const p of progress) {
    if (!p.chapter_id) continue;
    const entry = byChapter.get(p.chapter_id) || { count: 0, lastAt: 0, lessons: new Set() };
    if (p.lesson_id && !entry.lessons.has(p.lesson_id)) {
      entry.count++;
      entry.lessons.add(p.lesson_id);
    }
    const t = new Date(p.completed_at).getTime();
    if (t > entry.lastAt) entry.lastAt = t;
    byChapter.set(p.chapter_id, entry);
  }

  // 複習推薦：找 7-14 / 14-30 / 30-90 天前學的、不在最近 7 天再次碰過
  const recent7Set = new Set(progress.filter((p) => new Date(p.completed_at) >= day7).map((p) => p.lesson_id));
  const reviewBuckets = {
    week: [] as any[], // 7-14 天前
    month: [] as any[], // 14-30
    longer: [] as any[], // 30-90
  };
  for (const p of progress) {
    if (!p.lesson_id || recent7Set.has(p.lesson_id)) continue;
    const t = new Date(p.completed_at);
    if (t >= day14 && t < day7 && reviewBuckets.week.length < 5) reviewBuckets.week.push(p);
    else if (t >= day30Date && t < day14 && reviewBuckets.month.length < 5) reviewBuckets.month.push(p);
    else if (t >= day90 && t < day30Date && reviewBuckets.longer.length < 5) reviewBuckets.longer.push(p);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">🛤️ 學習足跡</h1>
        <p className="text-sm text-fg-muted">
          {profile?.display_name || profile?.username || "學員"} · Lv {profile?.level ?? 1} · {profile?.xp ?? 0} XP
        </p>
      </div>

      {/* 1. 簽到 / 狀態 banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="🔥 連續簽到" value={`${(profile as any)?.streak_days ?? 0} 天`} />
        <StatCard label="📚 30 天完成" value={`${recent30.length} 課`} />
        <StatCard label="📂 涉獵章節" value={`${byChapter.size} 章`} />
        <StatCard label="⚠️ 弱項" value={`${weaks.length} 章`} />
      </div>

      {/* 2. 30 天 timeline */}
      <section>
        <h2 className="text-lg font-bold mb-3">📅 最近 30 天每日完成</h2>
        {byDay.size === 0 ? (
          <div className="bg-bg-card border border-border rounded-xl p-8 text-center text-fg-muted">
            還沒有學習紀錄、<Link href="/chapters" className="text-accent underline">挑一章開始</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {Array.from(byDay.entries()).map(([day, items]) => (
              <div key={day} className="bg-bg-card border border-border rounded-xl p-4">
                <div className="font-bold mb-2 flex items-center gap-2">
                  <span>📅 {day}</span>
                  <span className="text-xs text-fg-muted">完成 {items.length} 件</span>
                </div>
                <ul className="space-y-1">
                  {items.map((p: any, i: number) => {
                    const ch = ALL_CHAPTERS.find((c: any) => c.id === p.chapter_id);
                    const lesson = ch?.lessons?.find((l: any) => l.id === p.lesson_id);
                    return (
                      <li key={i} className="text-sm flex items-center gap-2">
                        <span className="text-fg-muted font-mono text-xs">{p.lesson_id}</span>
                        <Link
                          href={`/chapters/${p.chapter_id}#lesson-${p.lesson_id}`}
                          className="hover:text-accent transition"
                        >
                          {lesson?.title || ch?.title || "—"}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. 章節進度卡 */}
      <section>
        <h2 className="text-lg font-bold mb-3">📂 章節進度（最近碰過）</h2>
        {byChapter.size === 0 ? (
          <div className="text-sm text-fg-muted">還沒有章節進度</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from(byChapter.entries())
              .sort(([, a], [, b]) => b.lastAt - a.lastAt)
              .slice(0, 12)
              .map(([cid, info]) => {
                const ch = ALL_CHAPTERS.find((c: any) => c.id === cid);
                const total = ch?.lessons?.length ?? 0;
                const pct = total ? Math.round((info.count / total) * 100) : 0;
                return (
                  <Link
                    key={cid}
                    href={`/chapters/${cid}`}
                    className="bg-bg-card border border-border rounded-xl p-4 hover:border-accent transition"
                  >
                    <div className="font-bold truncate">Ch{String(cid).padStart(2, "0")} {ch?.title || "—"}</div>
                    <div className="text-xs text-fg-muted mt-1">
                      {info.count} / {total} 課 · {pct}%
                    </div>
                    <div className="h-1.5 bg-bg-elevated rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-[10px] text-fg-muted mt-2">
                      {new Date(info.lastAt).toLocaleDateString("zh-TW", { month: "2-digit", day: "2-digit" })} 最後碰
                    </div>
                  </Link>
                );
              })}
          </div>
        )}
      </section>

      {/* 4. 複習推薦 */}
      {(reviewBuckets.week.length + reviewBuckets.month.length + reviewBuckets.longer.length) > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">💡 該複習了（艾賓浩斯遺忘曲線）</h2>
          <div className="space-y-3">
            {reviewBuckets.week.length > 0 && (
              <ReviewBucket label="🟡 7-14 天前學過" items={reviewBuckets.week} />
            )}
            {reviewBuckets.month.length > 0 && (
              <ReviewBucket label="🟠 14-30 天前學過" items={reviewBuckets.month} />
            )}
            {reviewBuckets.longer.length > 0 && (
              <ReviewBucket label="🔴 30-90 天前學過、可能忘了" items={reviewBuckets.longer} />
            )}
          </div>
        </section>
      )}

      {/* 5. 弱項章節 */}
      {weaks.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">⚠️ 弱項章節（quiz 平均偏低）</h2>
          <div className="bg-bg-card border border-border rounded-xl divide-y divide-border">
            {weaks.map((w) => {
              const ch = ALL_CHAPTERS.find((c: any) => c.id === w.chapter_id);
              return (
                <Link
                  key={w.chapter_id}
                  href={`/chapters/${w.chapter_id}`}
                  className="flex items-center justify-between p-3 hover:bg-bg-elevated transition"
                >
                  <div>
                    <div className="font-bold">Ch{String(w.chapter_id).padStart(2, "0")} {ch?.title}</div>
                    <div className="text-xs text-fg-muted">{w.attempt_count} 次 quiz</div>
                  </div>
                  <div className="text-lg font-mono text-orange-600 dark:text-orange-300">
                    {Number(w.avg_pct).toFixed(0)} 分
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <div className="text-center text-xs text-fg-muted py-4">
        🤖 綁定 LINE bot 後、每晚 20:00 自動推學習回顧 ·{" "}
        <Link href="/settings/notifications" className="text-accent underline">通知設定</Link>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-3 text-center">
      <div className="text-xs text-fg-muted">{label}</div>
      <div className="text-lg font-bold mt-1">{value}</div>
    </div>
  );
}

function ReviewBucket({ label, items }: { label: string; items: any[] }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-3">
      <div className="font-bold text-sm mb-2">{label}</div>
      <ul className="space-y-1">
        {items.map((p, i) => {
          const ch = ALL_CHAPTERS.find((c: any) => c.id === p.chapter_id);
          const lesson = ch?.lessons?.find((l: any) => l.id === p.lesson_id);
          return (
            <li key={i} className="text-sm">
              <Link
                href={`/chapters/${p.chapter_id}#lesson-${p.lesson_id}`}
                className="hover:text-accent transition"
              >
                <span className="text-fg-muted font-mono text-xs mr-2">{p.lesson_id}</span>
                {lesson?.title || ch?.title || "—"}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
