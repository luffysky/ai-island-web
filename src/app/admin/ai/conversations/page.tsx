import { createSupabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";

export default async function ConversationsPage() {
  const supabase = createSupabaseAdmin();

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
      <h2 className="text-xl font-bold">💬 AI 對話紀錄</h2>
      <p className="text-sm text-fg-muted">最近 100 個對話、用來 audit user 跟 AI 怎麼互動</p>

      <div className="bg-bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated text-left text-xs text-fg-muted uppercase">
            <tr>
              <th className="px-4 py-3">主題</th>
              <th className="px-4 py-3">用戶</th>
              <th className="px-4 py-3">語氣</th>
              <th className="px-4 py-3">BYOK</th>
              <th className="px-4 py-3">最後更新</th>
            </tr>
          </thead>
          <tbody>
            {convs?.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-fg-muted">沒有對話</td></tr>
            ) : (
              convs?.map((c: any) => (
                <tr key={c.id} className="border-t border-border hover:bg-bg-elevated">
                  <td className="px-4 py-3 max-w-xs truncate">{c.title || "(無標題)"}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/users?q=${c.profiles?.username}`} className="hover:text-accent">
                      {c.profiles?.display_name || c.profiles?.username || "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs">{c.tone}</td>
                  <td className="px-4 py-3 text-xs">{c.use_byok ? "✓" : "—"}</td>
                  <td className="px-4 py-3 text-xs text-fg-muted">{new Date(c.updated_at).toLocaleString('zh-TW')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
