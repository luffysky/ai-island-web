import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { AiCostClient } from "./AiCostClient";

export const dynamic = "force-dynamic";

export default async function AiCostPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/ai-cost");
  const { data: p } = await supabase.from("profiles").select("role, is_owner").eq("id", user.id).maybeSingle();
  const ok = (p as any)?.is_owner || ["admin", "owner"].includes((p as any)?.role ?? "");
  if (!ok) redirect("/");

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <header className="mb-5">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">💰 AI 成本 / Unit Economics</h1>
        <p className="text-sm text-fg-muted mt-1">
          每 user 月燒 / Top spender / Free vs Paid 平均 / breakeven 對照
        </p>
      </header>
      <AiCostClient />
    </div>
  );
}
