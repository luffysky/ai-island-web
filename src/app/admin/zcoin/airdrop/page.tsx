import { AirdropForm } from "./AirdropForm";
import { adminHref } from "@/lib/admin-href";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AirdropPage() {
  return (
    <div className="space-y-4">
      <Link
        href={adminHref("/admin/zcoin") as any}
        className="text-sm text-fg-muted hover:text-accent"
      >
        ← 回 Z-coin 流水
      </Link>
      <div>
        <h2 className="text-xl font-bold">🪙 Z-coin 批次發放（Airdrop）</h2>
        <p className="text-sm text-fg-muted mt-1">
          活動補償、節慶禮、回饋活躍用戶。先預覽人數、確認後一次發放。所有發放寫進 audit log。
        </p>
      </div>
      <AirdropForm />
    </div>
  );
}
