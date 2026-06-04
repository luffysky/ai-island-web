import { createSupabaseServer } from "@/lib/supabase-server";
import { chapters } from "@/data/chapters";
import { NotesExportButton } from "./NotesExportButton";
import { NotesManager, type ManagedNote } from "./NotesManager";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: ownNotes } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true, nullsFirst: true })
    .order("updated_at", { ascending: false });

  // 別人共用給我的筆記（含我的權限 role）
  const { data: collabRows } = await supabase
    .from("note_collaborators").select("note_id, role").eq("user_id", user.id);
  const roleByNote = new Map<string, string>((collabRows ?? []).map((r) => [r.note_id, r.role]));
  const sharedIds = (collabRows ?? []).map((r) => r.note_id);
  let sharedNotes: any[] = [];
  if (sharedIds.length) {
    const { data } = await supabase.from("notes").select("*").in("id", sharedIds)
      .order("updated_at", { ascending: false });
    sharedNotes = data ?? [];
  }
  // 我自己的筆記中、哪些有共用出去（有協作者）
  const ownIds = (ownNotes ?? []).map((n) => n.id);
  const sharedOwnIds = new Set<string>();
  if (ownIds.length) {
    const { data } = await supabase.from("note_collaborators").select("note_id").in("note_id", ownIds);
    for (const r of data ?? []) sharedOwnIds.add(r.note_id);
  }
  const notes = [
    ...(ownNotes ?? []).map((n) => ({ ...n, _owned: true, _shared: sharedOwnIds.has(n.id), _role: "owner" })),
    ...sharedNotes.map((n) => ({ ...n, _owned: false, _shared: true, _role: roleByNote.get(n.id) ?? "editor" })),
  ];

  // SRS 間隔複習排程
  const { data: reviewRows } = await supabase
    .from("note_reviews")
    .select("note_id, due_at, interval_days, ease, reviews")
    .eq("user_id", user.id);

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

      <NotesManager initial={list} chapterMap={chapterMap} meId={user.id} initialReviews={(reviewRows ?? []) as any} />
    </div>
  );
}
