import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { ChaptersAuditClient } from "./ChaptersAuditClient";

export const dynamic = "force-dynamic";

export default async function ChaptersAuditPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/chapters-audit");
  const { data: p } = await supabase.from("profiles").select("role, is_owner").eq("id", user.id).maybeSingle();
  const ok = (p as any)?.is_owner || ["admin", "owner"].includes((p as any)?.role ?? "");
  if (!ok) redirect("/");

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <header className="mb-5">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">🔍 章節 audit</h1>
        <p className="text-sm text-fg-muted mt-1">
          雪鑰掃 76 章 lesson 品質：太短 / 缺 analogy / 缺 tip / 缺 summary。點章節跑 AI 深度檢查。
        </p>
      </header>
      <ChaptersAuditClient />
    </div>
  );
}
