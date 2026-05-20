import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { AIKeysClient } from "./AIKeysClient";

export default async function AIKeysSettingsPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: keys } = await supabase
    .from("user_api_keys")
    .select("id, provider, label, is_active, created_at, last_used_at")
    .eq("user_id", user.id);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🔑 AI API Keys（BYOK）</h1>
        <p className="text-sm text-[var(--color-fg-muted)] mt-2">
          自帶 API key、跳過每日免費額度限制、用多少付多少給原廠。
          AI 島不收手續費、key 在 DB 加密存放。
        </p>
      </div>
      <AIKeysClient initialKeys={keys ?? []} />
    </div>
  );
}
