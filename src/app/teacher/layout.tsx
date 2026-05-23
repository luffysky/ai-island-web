import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/teacher");
  const { data: profile } = await supabase.from("profiles").select("role, display_name, username").eq("id", user.id).single();
  if (!["admin", "teacher", "assistant", "editor"].includes(profile?.role ?? "")) redirect("/");

  return (
    <div>
      <header className="bg-bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎓</span>
            <h1 className="font-bold">教師後台</h1>
            <span className="text-xs text-fg-muted">— {profile?.display_name || profile?.username}（{profile?.role}）</span>
          </div>
          <nav className="flex gap-1 text-sm">
            <Link href="/teacher" className="px-3 py-1.5 rounded-lg hover:bg-bg-elevated">總覽</Link>
            <Link href="/teacher/assignments" className="px-3 py-1.5 rounded-lg hover:bg-bg-elevated">📋 作業</Link>
            <Link href="/teacher/grading" className="px-3 py-1.5 rounded-lg hover:bg-bg-elevated">✏️ 批改</Link>
            <Link href="/teacher/stats" className="px-3 py-1.5 rounded-lg hover:bg-bg-elevated">📊 業績</Link>
            <Link href="/" className="px-3 py-1.5 rounded-lg text-fg-muted hover:bg-bg-elevated">← 回前台</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
