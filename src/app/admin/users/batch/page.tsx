import { BatchOpsClient } from "./BatchOpsClient";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

export default function AdminUsersBatchPage() {
  return (
    <div className="space-y-6">
      <PageHero
        emoji="👥"
        title="批次使用者操作"
        desc="貼 user id（一行一個）、選操作、執行。所有動作會寫 admin_events、可撤回。"
        gradient="from-blue-500/10 via-indigo-500/10 to-purple-500/10"
        borderColor="border-blue-500/30"
      />
      <BatchOpsClient />
    </div>
  );
}
