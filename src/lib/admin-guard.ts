/**
 * 後台 API route 共用授權 guard — 單一 source of truth
 *
 * 取代散落在 ~100 條 admin route 的 inline `["admin","owner"].includes(...)`
 * 與各自的 local `gateAdmin()`。新 admin route 一律 import 這個。
 *
 * 設計：
 *   - 用 createSupabaseServer()（getUser 會向 Supabase 驗 token、不是只讀 cookie）
 *   - owner 判斷沿用中央 checkOwner()（多 signal、不誤殺林董）
 *   - admin = isOwner || role === 'admin'
 *   - 回傳 discriminated union、route 端 early-return
 *
 * 用法（API route）：
 *   import { requireAdmin } from "@/lib/admin-guard";
 *
 *   export async function POST(req: NextRequest) {
 *     const gate = await requireAdmin();
 *     if (!gate.ok) return gate.response;          // 401 / 403 已包好
 *     // gate.userId / gate.isOwner / gate.role 可直接用
 *     const admin = createSupabaseAdmin();
 *     ...
 *   }
 *
 * 只要林董本人 → requireOwner()；一般管理員也可進 → requireAdmin()。
 */

import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { checkOwner } from "@/lib/is-owner";

export type GuardOk = {
  ok: true;
  userId: string;
  role: string | null;
  username: string | null;
  isOwner: boolean;
};

export type GuardFail = {
  ok: false;
  status: 401 | 403;
  response: NextResponse;
};

export type GuardResult = GuardOk | GuardFail;

function fail(status: 401 | 403, error: string): GuardFail {
  return { ok: false, status, response: NextResponse.json({ error }, { status }) };
}

/**
 * 內部：驗 token + 拉 profile + 跑 owner 判斷。
 * 不直接對外，requireAdmin / requireOwner 包它。
 */
async function resolveActor(): Promise<
  | { ok: false; status: 401; response: NextResponse }
  | {
      ok: true;
      userId: string;
      role: string | null;
      username: string | null;
      isOwner: boolean;
    }
> {
  const supabase = await createSupabaseServer();

  // getUser() 會向 Supabase 驗證 token、比只讀 cookie 安全
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ...fail(401, "unauthorized"), status: 401 };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, username, is_owner")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile as any)?.role ?? null;
  const username = (profile as any)?.username ?? null;

  // 沿用中央 owner 判斷（email 走 auth.users、這裡用已知 signal 即可）
  const { isOwner } = checkOwner({
    id: user.id,
    role,
    username,
    isOwner: (profile as any)?.is_owner ?? null,
    email: user.email ?? null,
  });

  return { ok: true, userId: user.id, role, username, isOwner };
}

/**
 * 一般後台 gate：owner 或 role === 'admin' 都放行。
 * 多數 /api/admin/* route 用這個。
 */
export async function requireAdmin(): Promise<GuardResult> {
  const actor = await resolveActor();
  if (!actor.ok) return actor;

  const isAdmin = actor.isOwner || actor.role === "admin";
  if (!isAdmin) return fail(403, "forbidden");

  return {
    ok: true,
    userId: actor.userId,
    role: actor.role,
    username: actor.username,
    isOwner: actor.isOwner,
  };
}

/**
 * 放寬給特定角色的 gate：owner 一律放行，外加 allowedRoles 內的角色。
 * 用在「不是只有 admin、teacher/assistant/editor 也能用」的後台 route
 * （客服罐頭、工單、changelog、SEO override 等），保留各自原本的角色集合、不改語意。
 *
 *   const gate = await requireStaff(["admin", "teacher", "assistant"]);
 *   if (!gate.ok) return gate.response;
 */
export async function requireStaff(allowedRoles: string[]): Promise<GuardResult> {
  const actor = await resolveActor();
  if (!actor.ok) return actor;

  const allowed = actor.isOwner || (actor.role != null && allowedRoles.includes(actor.role));
  if (!allowed) return fail(403, "forbidden");

  return {
    ok: true,
    userId: actor.userId,
    role: actor.role,
    username: actor.username,
    isOwner: actor.isOwner,
  };
}

/**
 * 僅限林董本人（owner）：危險操作用這個，
 * 例如 env 變更、breach 操作、impersonate、刪資料、金流設定。
 */
export async function requireOwner(): Promise<GuardResult> {
  const actor = await resolveActor();
  if (!actor.ok) return actor;

  if (!actor.isOwner) return fail(403, "owner_only");

  return {
    ok: true,
    userId: actor.userId,
    role: actor.role,
    username: actor.username,
    isOwner: actor.isOwner,
  };
}
