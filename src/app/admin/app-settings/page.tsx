import { redirect } from "next/navigation";
import { adminHref } from "@/lib/admin-href";

// 已整合進 /admin/settings（系統設定）。舊網址自動轉址、避免兩頁編輯同一張 app_settings 表造成混淆。
export const dynamic = "force-dynamic";

export default function AppSettingsRedirect() {
  redirect(adminHref("/admin/settings"));
}
