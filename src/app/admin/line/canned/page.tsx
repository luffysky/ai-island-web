import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { adminHref } from "@/lib/admin-href";
import { ArrowLeft } from "lucide-react";
import { CannedClient } from "./CannedClient";

export const dynamic = "force-dynamic";

export default async function AdminCannedPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["admin", "teacher", "assistant"].includes(profile?.role ?? "")) redirect("/");

  const admin = createSupabaseAdmin();
  const { data: replies } = await admin
    .from("canned_replies")
    .select("*")
    .or(`owner_user_id.is.null,owner_user_id.eq.${user.id}`)
    .order("use_count", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-4">
      <Link
        href={adminHref("/admin/line") as any}
        className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-accent"
      >
        <ArrowLeft size={14} /> 回 LINE 控制台
      </Link>

      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">💬 罐頭訊息管理</h1>
        <p className="text-sm text-fg-muted mt-1 leading-relaxed">
          常用客服回覆模板、CRM 回覆 ticket / LINE 推 user 訊息時可一鍵套用。
          <br />
          支援變數：<code className="bg-bg px-1 rounded text-xs">{`{{username}}`}</code>{" "}
          <code className="bg-bg px-1 rounded text-xs">{`{{ticket_id}}`}</code>{" "}
          <code className="bg-bg px-1 rounded text-xs">{`{{ticket_subject}}`}</code>
        </p>
      </header>

      <CannedClient initial={(replies as any) ?? []} currentUserId={user.id} />
    </div>
  );
}
