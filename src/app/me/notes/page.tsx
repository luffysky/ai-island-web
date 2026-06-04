import { createSupabaseServer } from "@/lib/supabase-server";
import { chapters } from "@/data/chapters";
import { NotesExportButton } from "./NotesExportButton";
import { NotesManager, type ManagedNote } from "./NotesManager";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: notes } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true, nullsFirst: true })
    .order("updated_at", { ascending: false });

  // 章節 / lesson 標題對照（卡片顯示用）
  const chapterMap: Record<string, { chapterTitle: string; lessonTitle: string }> = {};
  for (const ch of chapters) {
    chapterMap[`ch${ch.id}`] = { chapterTitle: ch.title, lessonTitle: "" };
    for (const l of ch.lessons ?? []) {
      chapterMap[l.id] = { chapterTitle: ch.title, lessonTitle: l.title };
    }
  }

  const list = (notes ?? []) as ManagedNote[];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">📝 我的筆記</h1>
          <p className="text-sm text-fg-muted">共 {list.length} 則筆記</p>
        </div>
        {list.length > 0 && <NotesExportButton />}
      </div>

      <NotesManager initial={list} chapterMap={chapterMap} />
    </div>
  );
}
