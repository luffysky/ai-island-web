import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { SettingsForm } from "./SettingsForm";
import { PreciseLocationToggle } from "@/components/PreciseLocationToggle";
import { GdprSection } from "./GdprSection";
import { LineBindSection } from "./LineBindSection";

export default async function SettingsPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (!profile) redirect("/login");

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-6">
      <h1 className="text-2xl font-bold">設定</h1>
      <SettingsForm profile={profile} email={user.email!} />
      <LineBindSection
        initialBound={!!profile.line_user_id}
        initialNotifyEnabled={profile.line_notify_enabled !== false}
      />
      <PreciseLocationToggle />
      <GdprSection initialDeletedAt={profile.deleted_at ?? null} />
    </div>
  );
}
