import { BroadcastForm } from "../BroadcastForm";
import { adminHref } from "@/lib/admin-href";
import Link from "next/link";
import { PageHero } from "@/components/admin/PageHero";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default function NewBroadcastPage() {
  return (
    <div className="space-y-4">
      <Link
        href={adminHref("/admin/broadcasts") as any}
        className="text-sm text-fg-muted hover:text-accent inline-flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" /> 回公告列表
      </Link>
      <PageHero
        emoji="📣"
        title="新增公告"
        desc="站內公告 / Email / LINE 三通路一鍵發。先設受眾、Email subject、內容。可預覽再送、不可撤回（已寄者無法收回）。"
        gradient="from-orange-500/10 via-red-500/10 to-pink-500/10"
        borderColor="border-orange-500/30"
      />
      <BroadcastForm mode="new" />
    </div>
  );
}
