import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { adminHref } from "@/lib/admin-href";
import { BroadcastForm } from "../BroadcastForm";
import { PageHero } from "@/components/admin/PageHero";

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
      <PageHero
        emoji="📣"
        title={`編輯公告 #${broadcast.id.slice(0, 8)}`}
        desc={`${broadcast.sent_count ?? 0} 已寄 · ${broadcast.open_count ?? 0} 開信 · ${broadcast.click_count ?? 0} 點擊。已寄部分不可撤回。`}
        gradient="from-orange-500/10 via-red-500/10 to-pink-500/10"
        borderColor="border-orange-500/30"
      />
      <BroadcastForm mode="edit" broadcast={broadcast} />
    </div>
  );
}
