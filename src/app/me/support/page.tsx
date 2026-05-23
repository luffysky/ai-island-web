import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { SupportClient } from "./SupportClient";

export const dynamic = "force-dynamic";

export default async function MySupportPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, subject, category, priority, status, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">💬 客服中心</h1>
        <p className="text-sm text-fg-muted mt-1">提工單、admin 收到後會回覆。</p>
      </header>
      <SupportClient initial={(tickets ?? []) as any} />
    </div>
  );
}
