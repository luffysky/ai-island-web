import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServer } from "@/lib/supabase-server";
import { checkOwnerByProfileId } from "@/lib/is-owner";
import { PageHero } from "@/components/admin/PageHero";
import { ConversationsClient } from "./ConversationsClient";
import { Lock, AlertTriangle } from "lucide-react";

export default async function ConversationsPage() {
  const supabase = createSupabaseAdmin();

  // server-side owner check：owner 看完整對話、admin 只看 metadata
  const serverSb = await createSupabaseServer();
  const { data: { user } } = await serverSb.auth.getUser();
  const ownerCheck = user ? await checkOwnerByProfileId(user.id, supabase) : null;
  const isOwner = ownerCheck?.isOwner === true;

  // 只有 owner 看得到（一般 admin 完全不顯示）
  if (!isOwner) {
    return (
      <div className="bg-bg-card border border-border rounded-xl p-10 text-center">
        <div className="mb-2 flex justify-center"><Lock className="w-8 h-8 text-fg-muted" /></div>
        <div className="font-bold">這頁只有 owner 看得到</div>
        <div className="text-sm text-fg-muted mt-1">學員 AI 對話內容屬隱私、未開放給一般管理員。</div>
      </div>
    );
  }

  const { data: convs, error } = await supabase
    .from("ai_conversations")
    .select("*, profiles(username, display_name)")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error?.message?.includes("does not exist")) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-sm">
        <div className="font-bold mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> 需要先跑 ai_migration.sql</div>
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
