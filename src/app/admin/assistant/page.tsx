import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { checkOwner } from "@/lib/is-owner";
import { redirect } from "next/navigation";
import { PageHero } from "@/components/admin/PageHero";
import { Bot } from "lucide-react";
import { AssistantChat } from "./AssistantChat";
import { CAPABILITY_LIST_ZH } from "@/lib/admin-metrics";

export const dynamic = "force-dynamic";

// 建議問題（點一下直接送）
const SUGGESTIONS = [
  "今天賺了多少？",
  "本月營收多少、幾筆訂單？",
  "近 7 天新註冊多少人？",
  "現在有多少流失風險用戶？",
  "本月 AI 花了多少美金？",
  "付款金額前 5 名是誰？",
  "還有幾張客服工單沒處理？",
  "訂閱概況跟 MRR 多少？",
];

export default async function AdminAssistantPage() {
  // admin layout 已保護 /admin/*；這裡再做一層 role 檢查（與 idea-fragments 同模式）
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, username, is_owner")
    .eq("id", user.id)
    .maybeSingle();
  const { isOwner } = checkOwner({
    id: user.id,
    role: (profile as any)?.role ?? null,
    username: (profile as any)?.username ?? null,
    isOwner: (profile as any)?.is_owner ?? null,
    email: user.email ?? null,
  });
  if (!(isOwner || (profile as any)?.role === "admin")) redirect("/");

  return (
    <div className="space-y-4">
      <PageHero
        icon={Bot}
        title="AI 營運助手"
        desc="用白話問營運數據、AI 幫你查 + 摘要。只讀營運指標（營收 / 用戶 / 訂閱 / AI 花費 / 客服）、不碰任何寫入、也不會下任意 SQL。"
        gradient="from-violet-500/10 via-purple-500/10 to-blue-500/10"
        borderColor="border-violet-500/30"
      />
      <AssistantChat suggestions={SUGGESTIONS} capabilities={CAPABILITY_LIST_ZH} />
    </div>
  );
}
