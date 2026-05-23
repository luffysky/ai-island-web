import type { Metadata } from "next";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { formatTWDate } from "@/lib/format-date";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "更新日誌 · AI 島",
  description: "AI 島功能更新與修正紀錄",
};

const TAG_COLOR: Record<string, string> = {
  feature: "bg-emerald-500/15 text-emerald-400",
  fix: "bg-blue-500/15 text-blue-400",
  improvement: "bg-purple-500/15 text-purple-400",
  breaking: "bg-red-500/15 text-red-400",
  security: "bg-orange-500/15 text-orange-400",
};

export default async function ChangelogPage() {
  const admin = createSupabaseAdmin();
  const { data: entries } = await admin
    .from("changelog_entries")
    .select("id, version, title, body_md, tags, published_at")
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(100);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">📜 更新日誌</h1>
        <p className="text-sm text-fg-muted">AI 島平台的功能更新、修正、改善紀錄</p>
      </header>

      {(entries ?? []).length === 0 ? (
        <div className="text-center py-16 text-fg-muted">
          <p className="text-4xl mb-3">📭</p>
          <p>還沒有發布任何更新日誌</p>
        </div>
      ) : (
        <ol className="relative border-l-2 border-border space-y-8 pl-6">
          {entries!.map((e: any) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[35px] top-1 w-4 h-4 rounded-full bg-accent border-4 border-bg" />
              <div className="text-xs text-fg-muted">
                {formatTWDate(e.published_at)}
                {e.version && <span className="ml-2 font-mono">· {e.version}</span>}
              </div>
              <h2 className="text-xl font-bold mt-1">{e.title}</h2>
              {e.tags?.length > 0 && (
                <div className="flex gap-1.5 mt-2">
                  {e.tags.map((t: string) => (
                    <span
                      key={t}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${TAG_COLOR[t] ?? "bg-bg-elevated text-fg-muted"}`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="prose-custom mt-3 text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{e.body_md}</ReactMarkdown>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
