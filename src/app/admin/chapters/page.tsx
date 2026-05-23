import { getChapterMetas } from "@/lib/content";
import Link from "next/link";
import { adminHref } from "@/lib/admin-href";

export default async function AdminChaptersPage() {
  const chapters = await getChapterMetas();

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">📚 章節管理</h2>
      <p className="text-sm text-fg-muted mb-4">
        點章節進入編輯。每章右上「📝 出題」按鈕、可叫 AI 生 20 題章末測驗。
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {chapters.map((c) => (
          <div key={c.id} className="p-4 rounded-lg bg-bg-card border border-border hover:border-accent transition relative group">
            <Link href={adminHref(`/admin/chapters/${c.id}`) as any} className="block">
              <div className="text-xs text-fg-muted">Ch {String(c.id).padStart(2, "0")}</div>
              <div className="font-semibold pr-12">{c.title}</div>
              <div className="text-xs mt-2 flex justify-between text-fg-muted">
                <span>{c.lessonCount} lessons</span>
                <span className={c.status === "published" ? "text-accent" : "text-orange-400"}>
                  {c.status === "published" ? "✓ 已發布" : "撰寫中"}
                </span>
              </div>
            </Link>
            <Link
              href={adminHref(`/admin/chapters/${c.id}/quiz-builder`) as any}
              className="absolute top-2 right-2 text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 opacity-70 hover:opacity-100 transition"
              title="AI 出題助手"
            >
              📝 出題
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
