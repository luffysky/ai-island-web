import { isFeatureEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";

// 後台 feature_forum_enabled 關 → 整個 /forum 區段顯示關閉通知。
export default async function ForumLayout({ children }: { children: React.ReactNode }) {
  if (!(await isFeatureEnabled("forum"))) {
    return <FeatureOffNotice title="論壇暫時關閉" desc="論壇功能目前由站方關閉中，稍後再來。" />;
  }
  return <>{children}</>;
}
