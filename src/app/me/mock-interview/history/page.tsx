import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { HistoryClient } from "./HistoryClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = { title: "📋 面試記錄 · AI 島" };

export default async function MockHistoryPage() {
  const t = await getTranslations("mentor");
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/me/mock-interview/history");

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <header className="mb-5 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">📋 {t("mockHistoryPageTitle")}</h1>
          <p className="text-sm text-fg-muted mt-1">{t("mockHistoryPageSubtitle")}</p>
        </div>
        <Link href="/me/mock-interview" className="btn-chip btn-chip-success">
          🎤 {t("mockAgain")}
        </Link>
      </header>
      <HistoryClient />
    </div>
  );
}
