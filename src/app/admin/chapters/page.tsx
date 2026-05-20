import { getChapterMetas } from "@/lib/content";
import Link from "next/link";

export default async function AdminChaptersPage() {
  const chapters = await getChapterMetas();

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">📚 章節管理</h2>
      <p className="text-sm text-[var(--color-fg-muted)] mb-4">
        編輯 JSON 內容（撰寫中）。Production 環境應接 Supabase content table、不直接寫 JSON。
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {chapters.map((c) => (
          <Link key={c.id} href={`/admin/chapters/${c.id}`} className="p-4 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:border-[var(--color-accent)]">
            <div className="text-xs text-[var(--color-fg-muted)]">Ch {String(c.id).padStart(2, "0")}</div>
            <div className="font-semibold">{c.title}</div>
            <div className="text-xs mt-2 flex justify-between text-[var(--color-fg-muted)]">
              <span>{c.lessonCount} lessons</span>
              <span className={c.status === "published" ? "text-[var(--color-accent)]" : "text-orange-400"}>
                {c.status === "published" ? "✓ 已發布" : "撰寫中"}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
