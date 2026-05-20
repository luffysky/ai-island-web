import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { UserRow } from "./UserRow";

export default async function AdminUsersPage() {
  const supabase = createSupabaseAdmin();
  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">👥 使用者管理</h2>
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-bg-elevated)] text-xs text-[var(--color-fg-muted)]">
            <tr>
              <th className="text-left px-4 py-3">使用者</th>
              <th className="text-left px-4 py-3">等級</th>
              <th className="text-left px-4 py-3">XP</th>
              <th className="text-left px-4 py-3">Z-coin</th>
              <th className="text-left px-4 py-3">連勝</th>
              <th className="text-left px-4 py-3">角色</th>
              <th className="text-left px-4 py-3">註冊</th>
              <th className="text-left px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u: any) => <UserRow key={u.id} user={u} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
