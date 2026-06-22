import { isFeatureEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";

// 後台 feature_blog_enabled 關 → 整個 /blogs 區段顯示關閉通知。
export default async function BlogsLayout({ children }: { children: React.ReactNode }) {
  if (!(await isFeatureEnabled("blog"))) {
    return <FeatureOffNotice title="部落格暫時關閉" desc="部落格功能目前由站方關閉中，稍後再來。" />;
  }
  return <>{children}</>;
}
