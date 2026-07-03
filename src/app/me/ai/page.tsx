import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { loadUserMemory } from "@/lib/user-ai-memory";
import { AiProfileClient } from "./AiProfileClient";

export const dynamic = "force-dynamic";

export default async function MeAiPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const mem = await loadUserMemory(user.id);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <AiProfileClient
        initial={{
          summary: mem?.summary ?? null,
          preferences: mem?.preferences ?? {},
          topics: mem?.topics ?? [],
          turn_count: mem?.turn_count ?? 0,
        }}
      />
    </div>
  );
}
