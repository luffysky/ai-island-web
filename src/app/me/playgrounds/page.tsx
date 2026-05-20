import { createSupabaseServer } from "@/lib/supabase-server";
import { chapters } from "@/data/chapters";
import Link from "next/link";
import { Code2 } from "lucide-react";

export default async function MyPlaygroundsPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: playgrounds } = await supabase
    .from("playgrounds")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">💻 我的程式碼</h1>
      <p className="text-sm text-[var(--color-fg-muted)]">
        你在學習園地存的 code、共 {playgrounds?.length ?? 0} 個
      </p>

      {!playgrounds || playgrounds.length === 0 ? (
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-12 text-center text-[var(--color-fg-muted)]">
          <Code2 size={48} className="mx-auto mb-3 opacity-50" />
          <p>還沒存過任何 code</p>
          <p className="text-xs mt-1">在學習園地改完 code 按 💾 圖示存到雲端</p>
        </div>
      ) : (
        <div className="space-y-3">
          {playgrounds.map((p: any) => {
            const [chId] = p.lesson_id.split('.');
            const ch = chapters.find((c) => c.id === Number(chId));
            const lesson = ch?.lessons.find((l) => l.id === p.lesson_id);
            return (
              <Link
                key={p.id}
                href={`/chapters/${chId}` as any}
                className="block bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:border-[var(--color-accent)]/50 rounded-xl p-4 transition"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-[var(--color-accent)]/20 text-[var(--color-accent)]">
                        {p.language}
                      </span>
                      <span className="text-xs text-[var(--color-fg-muted)]">
                        Ch {chId.padStart(2, "0")} · {lesson?.title}
                      </span>
                    </div>
                    <div className="font-semibold">{p.title ?? p.playground_key}</div>
                  </div>
                  <div className="text-xs text-[var(--color-fg-muted)] flex-shrink-0">
                    {new Date(p.updated_at).toLocaleDateString('zh-TW')}
                  </div>
                </div>
                <pre className="text-xs font-mono bg-[var(--color-bg)] p-2 rounded overflow-x-hidden line-clamp-3 text-[var(--color-fg-muted)]">
                  {p.code.slice(0, 200)}{p.code.length > 200 && "..."}
                </pre>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
