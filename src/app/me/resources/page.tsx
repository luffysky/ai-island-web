import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { ResourcesClient } from "./ResourcesClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "外部資源 · AI 島",
  description: "雪鑰精選書 / 影片 / 部落格 / 工具 / 社群、根據你的進度推薦",
};

export default async function ResourcesPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/me/resources");

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <header className="mb-5">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          🧭 外部資源
        </h1>
        <p className="text-sm text-fg-muted mt-1">
          雪鑰精選書 / 影片 / 部落格 / 工具 / 社群 — 為你推薦適合的、想找特定資源用搜尋
        </p>
      </header>
      <ResourcesClient />
    </div>
  );
}
