import { isSignupEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";

// 後台 signup_enabled 關 → 不給註冊（顯示通知）。
export default async function SignupLayout({ children }: { children: React.ReactNode }) {
  if (!(await isSignupEnabled())) {
    return <FeatureOffNotice title="目前暫停註冊" desc="新帳號註冊暫時關閉中，稍後再來。已有帳號可直接登入。" />;
  }
  return <>{children}</>;
}
