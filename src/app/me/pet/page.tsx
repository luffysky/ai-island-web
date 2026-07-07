import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { PetSettings } from "./PetSettings";

export const dynamic = "force-dynamic";

export default async function PetSettingsPage() {
  const t = await getTranslations("learn");
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createSupabaseAdmin();
  let { data: pet } = await admin
    .from("pets")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!pet) {
    const { data: created } = await admin
      .from("pets")
      .insert({ user_id: user.id })
      .select("*")
      .single();
    pet = created;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🐾 {t("petTitle")}</h1>
        <p className="text-sm text-fg-muted mt-1">
          {t("petSubtitle")}
        </p>
      </div>
      <PetSettings initial={pet} />
    </div>
  );
}
