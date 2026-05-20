import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { EmailPrefsForm } from "./EmailPrefsForm";

export const dynamic = "force-dynamic";

export default async function EmailPrefsPage() {
  const supabase = await createSupabaseServer();
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
      <h1 className="text-2xl font-bold mb-2">Email 通知偏好</h1>
      <p className="text-sm text-[var(--color-fg-muted)] mb-6">
        管理你想從 AI 島收到的 email 類型。
      </p>

      <EmailPrefsForm initial={prefs} />
    </div>
  );
}
