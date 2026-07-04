import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { getEquippedCosmetics } from "@/lib/store-redeem";
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

  const equipped = await getEquippedCosmetics(user.id);
  const petSkin = equipped.pet_skin;
  const SKIN_LABEL: Record<string, string> = { gold: "黃金招財", galaxy: "星空" };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">🐣 寵物進化</h1>
        <p className="text-sm text-fg-muted mt-1">
          花 z 幣讓寵物升級、換造型、解鎖更多能力。
        </p>
        {petSkin && (
          <span className={`inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full text-xs font-bold border ${petSkin === "gold" ? "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-300" : "bg-gradient-to-r from-indigo-500/20 to-fuchsia-500/20 border-fuchsia-500/30 text-fuchsia-600 dark:text-fuchsia-300"}`}>
            ✨ 造型：{SKIN_LABEL[petSkin] ?? petSkin}（商店兌換）
          </span>
        )}
      </header>
      <PetEvolveClient pet={pet as any} zBalance={profile?.z_coin ?? 0} />
    </div>
  );
}
