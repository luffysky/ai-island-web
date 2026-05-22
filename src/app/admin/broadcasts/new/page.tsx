import { BroadcastForm } from "../BroadcastForm";
import { adminHref } from "@/lib/admin-href";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function NewBroadcastPage() {
  return (
    <div className="space-y-4">
      <Link
        href={adminHref("/admin/broadcasts") as any}
        className="text-sm text-[var(--color-fg-muted)] hover:text-[var(--color-accent)]"
      >
        ← 回公告列表
      </Link>
      <h2 className="text-xl font-bold">📣 新增公告</h2>
      <BroadcastForm mode="new" />
    </div>
  );
}
