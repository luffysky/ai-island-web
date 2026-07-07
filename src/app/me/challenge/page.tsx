import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { ChallengeClient } from "./ChallengeClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "🏆 週賽 Code Challenge · AI 島",
  description: "每週 1 題、提交 code、雪鑰 AI 評分、看本週排行榜",
};

export default async function ChallengePage() {
  const t = await getTranslations("learn");
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/me/challenge");

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <header className="mb-5">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">🏆 {t("challengeTitle")}</h1>
        <p className="text-sm text-fg-muted mt-1">
          {t("challengeSubtitle")}
        </p>
      </header>
      <ChallengeClient />
    </div>
  );
}
