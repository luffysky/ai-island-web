import { createSupabaseServer } from "@/lib/supabase-server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("teacher");
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/teacher");
  const { data: profile } = await supabase.from("profiles").select("role, display_name, username").eq("id", user.id).single();
  if (!["owner", "admin", "teacher", "assistant", "editor"].includes(profile?.role ?? "")) redirect("/");

  return (
    <div>
      <header className="bg-bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎓</span>
            <h1 className="font-bold">{t("backendTitle")}</h1>
            <span className="text-xs text-fg-muted">— {profile?.display_name || profile?.username}（{profile?.role}）</span>
          </div>
          <nav className="flex gap-1 text-sm">
            <Link href="/teacher" className="px-3 py-1.5 rounded-lg hover:bg-bg-elevated">{t("navOverview")}</Link>
            <Link href="/teacher/assignments" className="px-3 py-1.5 rounded-lg hover:bg-bg-elevated">📋 {t("navAssignments")}</Link>
            <Link href="/teacher/grading" className="px-3 py-1.5 rounded-lg hover:bg-bg-elevated">✏️ {t("navGrading")}</Link>
            <Link href="/teacher/stats" className="px-3 py-1.5 rounded-lg hover:bg-bg-elevated">📊 {t("navStats")}</Link>
            <Link href="/" className="px-3 py-1.5 rounded-lg text-fg-muted hover:bg-bg-elevated">← {t("backToSite")}</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
