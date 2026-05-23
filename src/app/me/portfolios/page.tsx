import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { PortfoliosClient } from "./PortfoliosClient";

export const dynamic = "force-dynamic";

export default async function MyPortfoliosPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: portfolios }, { data: playgrounds }, { data: profile }] = await Promise.all([
    supabase.from("portfolios").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }),
    supabase.from("playgrounds").select("id, title, language, playground_key").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(100),
    supabase.from("profiles").select("username").eq("id", user.id).maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">🎨 我的作品集</h1>
        <p className="text-sm text-fg-muted mt-1">
          把學過的 playgrounds 整理成公開作品集、放履歷用、給朋友看。
        </p>
      </header>
      <PortfoliosClient
        initial={(portfolios ?? []) as any}
        playgrounds={(playgrounds ?? []) as any}
        username={profile?.username ?? ""}
      />
    </div>
  );
}
