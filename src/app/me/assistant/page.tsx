import { getTranslations } from "next-intl/server";
import { AssistantHub } from "./AssistantHub";

export const dynamic = "force-dynamic";

export const metadata = { title: "AI 助教 | AI 島" };

export default async function AssistantPage() {
  const t = await getTranslations("mentor");
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">🤝 {t("assistantPageTitle")}</h1>
        <p className="text-sm text-fg-muted mt-1">
          {t("assistantPageSubtitle")}
        </p>
      </header>
      <AssistantHub />
    </div>
  );
}
