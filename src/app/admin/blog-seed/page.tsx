import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { PageHero } from "@/components/admin/PageHero";
import { Newspaper } from "lucide-react";
import { BlogSeedClient } from "./BlogSeedClient";

export const dynamic = "force-dynamic";

const PERSONA_USERNAMES = ["ai_island", "greenbot", "pygoblin", "frontelf", "debugpapa", "duowen"];

export default async function BlogSeedPage() {
  const admin = createSupabaseAdmin();
  const { data: personas } = await admin.from("profiles").select("id, username, display_name").in("username", PERSONA_USERNAMES);
  const ordered = PERSONA_USERNAMES.map((u) => (personas ?? []).find((p: any) => p.username === u)).filter(Boolean);

  return (
    <div className="space-y-6">
      <PageHero
        icon={Newspaper}
        title="部落格種子產生器"
        desc="出主題／角度 → AI 生部落格草稿（也可自己手打）→ 審核/編輯 → 以虛擬 AI 住民或官方身分發佈成公開文章。"
        gradient="from-sky-500/10 via-indigo-500/10 to-violet-500/10"
        borderColor="border-sky-500/30"
      />
      <BlogSeedClient personas={ordered as any} />
    </div>
  );
}
