/** Creator Island API 共用 guard：認證 + 功能旗標。 */
import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { getWorkspaceRole, roleAtLeast, type WorkspaceRole } from "@/lib/creator-engine/workspace";

export type ApiUser = { userId: string };

/** 回傳 userId 或 NextResponse（401 未登入 / 404 功能關閉）。 */
export async function requireCreatorUser(): Promise<ApiUser | NextResponse> {
  if (!(await isCreatorIslandEnabled())) {
    return NextResponse.json({ error: "feature_off", message: "創作者島嶼目前未開放" }, { status: 404 });
  }
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized", message: "請先登入" }, { status: 401 });
  return { userId: user.id };
}

/** 確認 caller 在 workspace 的角色 ≥ min，否則回 403。成功回 caller 角色。 */
export async function requireWorkspaceRole(
  workspaceId: string,
  userId: string,
  min: WorkspaceRole,
): Promise<WorkspaceRole | NextResponse> {
  const role = await getWorkspaceRole(workspaceId, userId);
  if (!roleAtLeast(role, min)) {
    return NextResponse.json({ error: "forbidden", message: "權限不足" }, { status: 403 });
  }
  return role as WorkspaceRole;
}
