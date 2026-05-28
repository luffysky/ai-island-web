import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServer } from "@/lib/supabase-server";
import { checkOwnerByProfileId } from "@/lib/is-owner";
import { PageHero } from "@/components/admin/PageHero";
import { ConversationsClient } from "./ConversationsClient";

export default async function ConversationsPage() {
  const supabase = createSupabaseAdmin();

  // server-side owner check：owner 看完整對話、admin 只看 metadata
  const serverSb = await createSupabaseServer();
  const { data: { user } } = await serverSb.auth.getUser();
  const ownerCheck = user ? await checkOwnerByProfileId(user.id, supabase) : null;
  const isOwner = ownerCheck?.isOwner === true;

  const { data: convs, error } = await supabase
    .from("ai_conversations")
    .select("*, profiles(username, display_name)")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error?.message?.includes("does not exist")) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-sm">
        <div className="font-bold mb-2">⚠️ 需要先跑 ai_migration.sql</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHero
        emoji="💬"
        title="AI 對話紀錄"
        desc={
          isOwner
            ? "點任一條對話「看內容」可展開完整訊息（含 tokens / cost）。"
            : "AI 對話 metadata：主題 / 用戶 / 時間 / token 用量。為了保護使用者隱私、對話內容不對外開放。"
        }
        gradient="from-violet-500/10 via-purple-500/10 to-fuchsia-500/10"
        borderColor="border-violet-500/30"
      />

      <ConversationsClient convs={(convs ?? []) as any} isOwner={isOwner} />
    </div>
  );
}
