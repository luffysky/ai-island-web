import { createSupabaseServer } from "@/lib/supabase-server";
import { chapters } from "@/data/chapters";
import Link from "next/link";
import { Code2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

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
      <p className="text-sm text-fg-muted">
        你在學習園地存的 code、共 {playgrounds?.length ?? 0} 個
      </p>

      {!playgrounds || playgrounds.length === 0 ? (
        <EmptyState emoji="💻" title="還沒存過任何 code" desc="在學習園地改完 code 按 💾 存到雲端" action={{ label: "看章節", href: "/chapters" }} />
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
                className="block bg-bg-card border border-border hover:border-accent/50 rounded-xl p-4 transition"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-accent/20 text-accent">
                        {p.language}
                      </span>
                      <span className="text-xs text-fg-muted">
                        Ch {chId.padStart(2, "0")} · {lesson?.title}
                      </span>
                    </div>
                    <div className="font-semibold">{p.title ?? p.playground_key}</div>
                  </div>
                  <div className="text-xs text-fg-muted flex-shrink-0">
                    {new Date(p.updated_at).toLocaleDateString('zh-TW')}
                  </div>
                </div>
                <pre className="text-xs font-mono bg-bg p-2 rounded overflow-x-hidden line-clamp-3 text-fg-muted">
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
