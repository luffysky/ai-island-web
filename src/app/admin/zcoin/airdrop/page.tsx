import { AirdropForm } from "./AirdropForm";
import { adminHref } from "@/lib/admin-href";
import Link from "next/link";
import { PageHero } from "@/components/admin/PageHero";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default function AirdropPage() {
  return (
    <div className="space-y-4">
      <Link
        href={adminHref("/admin/zcoin") as any}
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-accent"
      >
        <ArrowLeft className="w-4 h-4" /> 回 Z-coin 流水
      </Link>
      <PageHero
        emoji="🪙"
        title="Z-coin 批次發放（Airdrop）"
        desc="活動補償、節慶禮、回饋活躍用戶。先預覽人數、確認後一次發放。所有發放寫進 audit log。"
        gradient="from-amber-500/10 via-yellow-500/10 to-lime-500/10"
        borderColor="border-amber-500/30"
      />
      <AirdropForm />
    </div>
  );
}
