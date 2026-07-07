import { getTranslations } from "next-intl/server";
import { isFeatureEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";

// 後台 feature_forum_enabled 關 → 整個 /forum 區段顯示關閉通知。
export default async function ForumLayout({ children }: { children: React.ReactNode }) {
  if (!(await isFeatureEnabled("forum"))) {
    const t = await getTranslations("forum");
    return <FeatureOffNotice title={t("featureOffTitle")} desc={t("featureOffDesc")} />;
  }
  return <>{children}</>;
}
