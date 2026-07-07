import { isSignupEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { getTranslations } from "next-intl/server";

// 後台 signup_enabled 關 → 不給註冊（顯示通知）。
export default async function SignupLayout({ children }: { children: React.ReactNode }) {
  if (!(await isSignupEnabled())) {
    const t = await getTranslations("authpages");
    return <FeatureOffNotice title={t("signupPausedTitle")} desc={t("signupPausedDesc")} />;
  }
  return <>{children}</>;
}
