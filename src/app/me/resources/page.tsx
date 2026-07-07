import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { ResourcesClient } from "./ResourcesClient";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "外部資源 · AI 島",
  description: "雪鑰精選書 / 影片 / 部落格 / 工具 / 社群、根據你的進度推薦",
};

export default async function ResourcesPage() {
  const supabase = await createSupabaseServer();
  const t = await getTranslations("me");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/me/resources");

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <header className="mb-5">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          🧭 {t("resourcesTitle")}
        </h1>
        <p className="text-sm text-fg-muted mt-1">
          {t("resourcesSubtitle")}
        </p>
      </header>
      <ResourcesClient />
    </div>
  );
}
