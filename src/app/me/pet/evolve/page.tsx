import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { PetEvolveClient } from "./PetEvolveClient";

export const dynamic = "force-dynamic";

export default async function PetEvolvePage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: pet } = await supabase
    .from("pets")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("z_coin")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">🐣 寵物進化</h1>
        <p className="text-sm text-fg-muted mt-1">
          花 z 幣讓寵物升級、換造型、解鎖更多能力。
        </p>
      </header>
      <PetEvolveClient pet={pet as any} zBalance={profile?.z_coin ?? 0} />
    </div>
  );
}
