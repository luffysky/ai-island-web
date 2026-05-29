import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { MentorClient } from "./MentorClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "🤝 學員配對 · AI 島",
  description: "找 mentor / 當 mentor / 找 peer 一起學、雪鑰幫你配最適合的",
};

export default async function MentorPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/me/mentor");

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <header className="mb-5">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">🤝 學員配對</h1>
        <p className="text-sm text-fg-muted mt-1">
          找 mentor 帶你 / 當 mentor 幫人 / 找 peer 一起學 — 不再孤身一人
        </p>
      </header>
      <MentorClient />
    </div>
  );
}
