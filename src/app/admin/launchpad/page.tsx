import { redirect } from "next/navigation";
import { Rocket } from "lucide-react";
import { createSupabaseServer } from "@/lib/supabase-server";
import { LaunchpadClient } from "./LaunchpadClient";

export const dynamic = "force-dynamic";

export default async function LaunchpadPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/launchpad");
  const { data: p } = await supabase.from("profiles").select("role, is_owner").eq("id", user.id).maybeSingle();
  const ok = (p as any)?.is_owner || ["admin", "owner"].includes((p as any)?.role ?? "");
  if (!ok) redirect("/");

  return (
    <div className="p-4 md:p-6 max-w-[1800px] mx-auto">
      <header className="mb-5">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Rocket className="w-7 h-7" /> Launchpad
        </h1>
        <p className="text-sm text-fg-muted mt-1">
          指揮中心：全功能總覽 / 待辦 / 許願池 — 拖曳卡片改狀態、可加卡片、可刪
        </p>
      </header>
      <LaunchpadClient />
    </div>
  );
}
