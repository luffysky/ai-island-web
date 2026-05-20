import { createSupabaseAdmin } from "@/lib/supabase";
import { UnsubscribeForm } from "./UnsubscribeForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "退訂通知 | AI 島",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="max-w-md mx-auto p-8 text-center mt-16">
        <h1 className="text-2xl font-bold mb-4">無效連結</h1>
        <p className="text-[var(--color-fg-muted)]">
          這個退訂連結不完整、請從你收到的 email 直接點連結。
        </p>
      </div>
    );
  }

  const admin = createSupabaseAdmin();
  const { data: sub } = await admin
    .from("email_subscriptions")
    .select("*")
    .eq("unsubscribe_token", token)
    .maybeSingle();

  if (!sub) {
    return (
      <div className="max-w-md mx-auto p-8 text-center mt-16">
        <h1 className="text-2xl font-bold mb-4">連結已失效</h1>
        <p className="text-[var(--color-fg-muted)]">
          這個退訂連結無效或已過期。
        </p>
      </div>
    );
  }

  if (sub.unsubscribed_at) {
    return (
      <div className="max-w-md mx-auto p-8 text-center mt-16">
        <h1 className="text-2xl font-bold mb-4">已退訂</h1>
        <p className="text-[var(--color-fg-muted)]">
          {sub.email} 已退訂於 {new Date(sub.unsubscribed_at).toLocaleDateString("zh-TW")}
        </p>
        <p className="text-sm mt-4">
          想重新訂閱？請登入後到「會員中心 → Email 偏好設定」修改。
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-8 mt-16">
      <h1 className="text-2xl font-bold mb-2">退訂通知</h1>
      <p className="text-sm text-[var(--color-fg-muted)] mb-6">
        Email: <strong>{sub.email}</strong>
      </p>

      <UnsubscribeForm
        token={token}
        current={{
          newsletter: sub.newsletter,
          product_updates: sub.product_updates,
          course_announcements: sub.course_announcements,
          weekly_digest: sub.weekly_digest,
        }}
      />

      <p className="text-xs text-[var(--color-fg-muted)] mt-6">
        💡 注意：系統必要的交易型通知（訂單確認、密碼重設等）無法退訂、
        以確保你的帳號安全。
      </p>
    </div>
  );
}
