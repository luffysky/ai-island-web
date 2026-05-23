import { createSupabaseServer } from "@/lib/supabase-server";
import { chapters } from "@/data/chapters";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const { data: notes } = await supabase
    .from("notes")
    .select("id, chapter_id, lesson_id, content, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const date = new Date().toISOString().slice(0, 10);
  const lines: string[] = [
    `# AI 島 · 我的筆記（${date}）`,
    "",
    `> 共 ${notes?.length ?? 0} 則筆記。`,
    "",
    "---",
    "",
  ];

  for (const n of notes ?? []) {
    const note = n as any;
    let header = "## 自由筆記";
    if (note.chapter_id) {
      const ch = chapters.find((c) => c.id === note.chapter_id);
      const lesson = ch?.lessons.find((l) => l.id === note.lesson_id);
      header = `## Ch ${note.chapter_id} · ${ch?.title ?? "—"}` + (lesson ? ` · ${lesson.title}` : "");
    }
    lines.push(header);
    lines.push("");
    lines.push(`_寫於 ${new Date(note.created_at).toISOString().slice(0, 10)}_`);
    lines.push("");
    lines.push(note.content);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  const md = lines.join("\n");
  const date2 = new Date().toISOString().slice(0, 10);
  return new Response(md, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="ai-island-notes-${date2}.md"`,
      "Cache-Control": "no-store",
    },
  });
}
