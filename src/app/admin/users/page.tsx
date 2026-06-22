import { createSupabaseAdmin } from "@/lib/supabase-admin";
import Link from "next/link";
import { adminHref } from "@/lib/admin-href";
import { UserRow } from "./UserRow";
import { UserCard } from "./UserCard";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    role?: string;
    status?: string;
    sort?: string;
    dir?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const role = sp.role ?? "all";
  const status = sp.status ?? "all";
  const sort = ["created_at", "xp", "last_active_at", "z_coin"].includes(sp.sort ?? "")
    ? (sp.sort as string)
    : "created_at";
  const dir = sp.dir === "asc" ? "asc" : "desc";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = createSupabaseAdmin();
  let query = supabase
    .from("profiles")
    .select("*", { count: "exact" });

  if (q) {
    const safe = q.replace(/[%,*()\\]/g, "");
    query = query.or(
      `username.ilike.%${safe}%,display_name.ilike.%${safe}%`
    );
  }
  if (role !== "all") query = query.eq("role", role);
  if (status === "banned") query = query.not("banned_at", "is", null);
  if (status === "active") query = query.is("banned_at", null);

  const { data: users, count } = await query
    .order(sort, { ascending: dir === "asc" })
    .range(from, to);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const buildHref = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { q, role, status, sort, dir, page: String(page), ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "all" && !(k === "page" && v === "1")) params.set(k, v);
    }
    const qs = params.toString();
    return adminHref(`/admin/users${qs ? "?" + qs : ""}`);
  };

  return (
    <div className="space-y-4">
      <PageHero
        emoji="👥"
        title="使用者管理"
        desc="搜尋、過濾、批次操作所有使用者。可看 XP / Z-coin / 等級 / 簽到 / 寵物等學習狀態。"
        gradient="from-blue-500/10 via-cyan-500/10 to-purple-500/10"
        borderColor="border-blue-500/30"
      >
        <Link
          href={adminHref("/admin/users/batch") as any}
          className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-accent hover:text-accent"
        >
          🔄 批次操作
        </Link>
      </PageHero>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div />
        <div className="flex items-center gap-3">
          <span className="text-xs text-fg-muted">
            共 {(count ?? 0).toLocaleString()} 人 · 第 {page}/{totalPages} 頁
          </span>
        </div>
      </div>

      {/* Filter bar */}
      <form action={adminHref("/admin/users")} className="mb-4 flex flex-wrap items-center gap-2 bg-bg-card border border-border rounded-xl p-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="🔍 搜尋 username / display name"
          className="flex-1 min-w-[200px] bg-bg border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-accent"
        />
        <select
          name="role"
          defaultValue={role}
          className="bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
        >
          <option value="all">所有角色</option>
          <option value="member">member</option>
          <option value="editor">editor</option>
          <option value="admin">admin</option>
          <option value="owner">owner</option>
        </select>
        <select
          name="status"
          defaultValue={status}
          className="bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
        >
          <option value="all">全部狀態</option>
          <option value="active">在用</option>
          <option value="banned">已封鎖</option>
        </select>
        <select
          name="sort"
          defaultValue={sort}
          className="bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
        >
          <option value="created_at">建立時間</option>
          <option value="xp">XP</option>
          <option value="last_active_at">最後活躍</option>
          <option value="z_coin">Z-coin</option>
        </select>
        <select
          name="dir"
          defaultValue={dir}
          className="bg-bg border border-border rounded-lg px-2 py-1.5 text-sm"
        >
          <option value="desc">由高到低</option>
          <option value="asc">由低到高</option>
        </select>
        <button
          type="submit"
          className="px-4 py-1.5 text-sm rounded-lg bg-accent text-black font-bold"
        >
          套用
        </button>
        {(q || role !== "all" || status !== "all") && (
          <Link
            href={adminHref("/admin/users") as any}
            className="px-3 py-1.5 text-sm rounded-lg border border-border"
          >
            清除
          </Link>
        )}
      </form>

      {/* 筆電 / 桌機 — table 模式 (≥1024px) */}
      <div className="hidden lg:block bg-bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-elevated text-xs text-fg-muted">
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
            {users?.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-fg-muted text-sm">
                  沒有符合條件的使用者
                </td>
              </tr>
            ) : (
              users?.map((u: any) => <UserRow key={u.id} user={u} />)
            )}
          </tbody>
        </table>
      </div>

      {/* 手機 + 平板 — 卡片 list、每張卡內部獨立 scroll (<1024px) */}
      <div className="lg:hidden space-y-2">
        {users?.length === 0 ? (
          <div className="bg-bg-card border border-border rounded-xl px-4 py-12 text-center text-fg-muted text-sm">
            沒有符合條件的使用者
          </div>
        ) : (
          users?.map((u: any) => <UserCard key={u.id} user={u} />)
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4 text-sm">
          <Link
            href={page > 1 ? (buildHref({ page: String(page - 1) }) as any) : "#"}
            className={`px-3 py-1.5 rounded-lg border border-border ${page <= 1 ? "opacity-40 pointer-events-none" : "hover:bg-bg-elevated"}`}
          >
            ← 上一頁
          </Link>
          <span className="text-xs text-fg-muted px-3">
            {page} / {totalPages}
          </span>
          <Link
            href={page < totalPages ? (buildHref({ page: String(page + 1) }) as any) : "#"}
            className={`px-3 py-1.5 rounded-lg border border-border ${page >= totalPages ? "opacity-40 pointer-events-none" : "hover:bg-bg-elevated"}`}
          >
            下一頁 →
          </Link>
        </div>
      )}
    </div>
  );
}
