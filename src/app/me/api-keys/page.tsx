import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { ApiKeysClient } from "./ApiKeysClient";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "🔑 我的 API Key · AI 島",
  description: "拿 AI 島 API key、在你自己的 app 用雪鑰的能力",
};

export default async function ApiKeysPage() {
  const supabase = await createSupabaseServer();
  const t = await getTranslations("me");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/me/api-keys");

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <header className="mb-5">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">🔑 {t("apiKeysTitle")}</h1>
        <p className="text-sm text-fg-muted mt-1">
          {t("apiKeysSubtitle")}
          <Link href="/docs/api" className="text-accent hover:underline ml-1">{t("apiKeysDocsLink")}</Link>
        </p>
      </header>
      {/* 釐清：這頁是「對外金鑰」；想填自己的模型 key（BYOK）在另一頁 */}
      <div className="mb-5 rounded-xl border border-accent/30 bg-accent/5 p-4 text-sm">
        <div className="font-bold mb-0.5">🔑 {t("apiKeysByokQ")}</div>
        <p className="text-fg-muted">
          {t("apiKeysByokP1")}<b>{t("apiKeysByokBold1")}</b>{t("apiKeysByokP2")}<b>{t("apiKeysByokBold2")}</b>
          {t("apiKeysByokP3")}
          <Link href="/settings/ai-keys" className="text-accent hover:underline font-bold ml-1">{t("apiKeysByokLink")}</Link>
        </p>
      </div>
      <ApiKeysClient />
    </div>
  );
}
