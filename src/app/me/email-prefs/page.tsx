import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { EmailPrefsForm } from "./EmailPrefsForm";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function EmailPrefsPage() {
  const supabase = await createSupabaseServer();
  const t = await getTranslations("me");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sub } = await supabase
    .from("email_subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  // 如果沒紀錄（舊用戶）、現場建一個
  const prefs = sub ?? {
    newsletter: true,
    product_updates: true,
    course_announcements: true,
    weekly_digest: false,
    transactional: true,
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">{t("emailPrefsTitle")}</h1>
      <p className="text-sm text-fg-muted mb-6">
        {t("emailPrefsSubtitle")}
      </p>

      <EmailPrefsForm initial={prefs} />
    </div>
  );
}
