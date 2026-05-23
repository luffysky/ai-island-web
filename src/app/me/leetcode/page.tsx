import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { LeetcodeListClient } from "./LeetcodeListClient";

export const dynamic = "force-dynamic";

export default async function LeetcodePage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createSupabaseAdmin();
  const [{ data: problems }, { data: solved }, { data: profile }] = await Promise.all([
    admin.from("leetcode_problems").select("*").eq("active", true).order("number", { ascending: true }).limit(500),
    admin.from("user_leetcode_solved").select("problem_id").eq("user_id", user.id),
    admin.from("profiles").select("leetcode_username, leetcode_stats").eq("id", user.id).single(),
  ] as any);

  const solvedSet = new Set((solved as any[] ?? []).map((s: any) => s.problem_id));

  return (
    <LeetcodeListClient
      problems={(problems as any) ?? []}
      solvedIds={Array.from(solvedSet) as string[]}
      leetcodeUsername={(profile as any)?.leetcode_username ?? null}
      leetcodeStats={(profile as any)?.leetcode_stats ?? null}
    />
  );
}
