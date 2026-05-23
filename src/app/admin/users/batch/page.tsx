import { BatchOpsClient } from "./BatchOpsClient";

export const dynamic = "force-dynamic";

export default function AdminUsersBatchPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">👥 批次使用者操作 (LT-18)</h1>
        <p className="text-sm text-fg-muted mt-1">
          貼 user id（一行一個）、選操作、執行。所有動作會寫 admin_events。
        </p>
      </header>
      <BatchOpsClient />
    </div>
  );
}
