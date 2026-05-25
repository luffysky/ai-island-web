import { createSupabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import { adminHref } from "@/lib/admin-href";
import { ArrowLeft, Send } from "lucide-react";
import { BroadcastForm } from "./BroadcastForm";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

export default async function AdminLineBroadcastPage() {
  const admin = createSupabaseAdmin();

  const [{ count: total }, { count: notifyOn }] = await Promise.all([
    admin.from("profiles").select("*", { count: "exact", head: true }).not("line_user_id", "is", null),
    admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .not("line_user_id", "is", null)
      .eq("line_notify_enabled", true),
  ]);

  return (
    <div className="space-y-4">
      <Link
        href={adminHref("/admin/line") as any}
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-accent"
      >
        <ArrowLeft size={14} /> 回 LINE 控制台
      </Link>

      <PageHero
        emoji="📣"
        title="群發訊息"
        desc="推給綁定 LINE 的用戶、依「收通知」狀態自動過濾。LINE multicast 限制 500 人 / 次、會自動分批。"
        gradient="from-amber-500/10 via-orange-500/10 to-red-500/10"
        borderColor="border-amber-500/30"
      />

      <BroadcastForm totalBound={total ?? 0} notifyOnCount={notifyOn ?? 0} />
    </div>
  );
}
