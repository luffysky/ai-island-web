import { createSupabaseServer } from "@/lib/supabase-server";
import { chapters } from "@/data/chapters";
import { Award } from "lucide-react";

export default async function CertificatesPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // 看每章完成度、自動產生證書資格
  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("chapter_id, lesson_id")
    .eq("user_id", user.id);

  const { data: certs } = await supabase
    .from("certificates")
    .select("*")
    .eq("user_id", user.id);

  // 計算每章完成度
  const completedChapters = chapters.map((ch) => {
    const done = progress?.filter((p: any) => p.chapter_id === ch.id).length ?? 0;
    const total = ch.lessons.length;
    return { ch, done, total, completed: done >= total };
  });

  const fullyCompleted = completedChapters.filter((c) => c.completed);
  const earnedCount = certs?.length ?? 0;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">🏅 我的證書</h1>
      <p className="text-sm text-fg-muted">
        完成整章可獲得章節證書 · 已獲得 {earnedCount} 張
      </p>

      {/* 已獲得 */}
      {certs && certs.length > 0 && (
        <div>
          <h2 className="font-bold mb-3">✨ 已獲得</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {certs.map((c: any) => (
              <div key={c.id} className="relative bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 rounded-xl p-5">
                <Award size={32} className="text-yellow-400 mb-2" />
                <h3 className="font-bold text-lg">{c.title}</h3>
                <div className="text-xs text-fg-muted mt-1">
                  發出於 {new Date(c.issued_at).toLocaleDateString('zh-TW')}
                </div>
                {c.verification_code && (
                  <div className="text-xs font-mono text-fg-muted mt-2">
                    驗證碼：{c.verification_code}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 已可申請 */}
      {fullyCompleted.length > 0 && (
        <div>
          <h2 className="font-bold mb-3">🎯 已可申請（{fullyCompleted.length} 章完成）</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fullyCompleted.map(({ ch }) => {
              const alreadyEarned = certs?.some((c: any) => c.cert_key === `ch${String(ch.id).padStart(2, "0")}`);
              if (alreadyEarned) return null;
              return (
                <div key={ch.id} className="bg-bg-card border border-border rounded-xl p-4">
                  <div className="text-xs text-fg-muted mb-1">Ch {String(ch.id).padStart(2, "0")}</div>
                  <h3 className="font-bold mb-2">{ch.title}</h3>
                  <button disabled className="text-xs px-3 py-1.5 bg-accent/20 text-accent rounded">
                    🎓 領取證書（自動發放中）
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 進行中 */}
      <div>
        <h2 className="font-bold mb-3">📚 進行中</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {completedChapters
            .filter((c) => !c.completed && c.done > 0)
            .slice(0, 6)
            .map(({ ch, done, total }) => {
              const pct = Math.round(done / total * 100);
              return (
                <div key={ch.id} className="bg-bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold truncate">{ch.title}</h3>
                    <span className="text-sm text-fg-muted">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-bg rounded-full overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-fg-muted mt-2">{done} / {total} lessons</div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
