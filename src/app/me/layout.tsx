import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { MeSidebar } from "./MeSidebar";

export const dynamic = "force-dynamic";

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, xp, level, z_coin, streak_days, avatar_url")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="flex gap-6">
        <MeSidebar profile={profile ?? null} />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
