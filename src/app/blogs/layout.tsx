import { getTranslations } from "next-intl/server";
import { isFeatureEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";

// 後台 feature_blog_enabled 關 → 整個 /blogs 區段顯示關閉通知。
export default async function BlogsLayout({ children }: { children: React.ReactNode }) {
  if (!(await isFeatureEnabled("blog"))) {
    const t = await getTranslations("blogs");
    return <FeatureOffNotice title={t("closedTitle")} desc={t("closedDesc")} />;
  }
  return <>{children}</>;
}
