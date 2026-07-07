import { DailyQuizClient } from "./DailyQuizClient";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function MyDailyQuizPage() {
  const t = await getTranslations("learn");
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">🧠 {t("quizTitle")}</h1>
        <p className="text-sm text-fg-muted mt-1">
          {t("quizSubtitle")}
        </p>
      </header>
      <DailyQuizClient />
    </div>
  );
}
