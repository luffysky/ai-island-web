import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { NamiPlayground } from "./NamiPlayground";

export const dynamic = "force-dynamic";

export default async function NamiPlaygroundPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, username, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") redirect("/");

  return (
    <div className="space-y-4">
      <NamiPlayground
        username={profile.username}
        displayName={profile.display_name}
        avatarUrl={profile.avatar_url}
      />
    </div>
  );
}
