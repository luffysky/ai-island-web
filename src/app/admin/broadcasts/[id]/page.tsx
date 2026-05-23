import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { adminHref } from "@/lib/admin-href";
import { BroadcastForm } from "../BroadcastForm";

export const dynamic = "force-dynamic";

export default async function EditBroadcastPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createSupabaseAdmin();
  const { data: broadcast } = await admin
    .from("broadcasts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!broadcast) notFound();

  return (
    <div className="space-y-4">
      <Link
        href={adminHref("/admin/broadcasts") as any}
        className="text-sm text-fg-muted hover:text-accent"
      >
        ← 回公告列表
      </Link>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">📣 編輯公告 #{broadcast.id.slice(0, 8)}</h2>
        <div className="text-xs text-fg-muted">
          {broadcast.sent_count ?? 0} 已寄 · {broadcast.open_count ?? 0} 開信 · {broadcast.click_count ?? 0} 點擊
        </div>
      </div>
      <BroadcastForm mode="edit" broadcast={broadcast} />
    </div>
  );
}
