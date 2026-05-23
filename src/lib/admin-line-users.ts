/**
 * 多管理員 LINE 識別
 *
 * 兩種設定法（擇一）：
 * 1. ADMIN_LINE_USERS=JSON
 *    [{"id":"Uxxxx","name":"luffy","role":"董事長"},{"id":"Uyyyy","name":"小王","role":"客服主管"}]
 *
 * 2. 單一 admin（舊版相容）
 *    ADMIN_LINE_USER_ID=Uxxxx
 *    ADMIN_LINE_USER_LABEL=luffy        （optional、預設「管理員」）
 *    ADMIN_LINE_USER_ROLE=董事長        （optional、預設「董事長」）
 */

export type AdminLineUser = { id: string; name: string; role: string };

export function getAdminLineUsers(): AdminLineUser[] {
  const json = process.env.ADMIN_LINE_USERS;
  if (json) {
    try {
      const arr = JSON.parse(json);
      if (Array.isArray(arr)) return arr.filter((x) => x && typeof x.id === "string");
    } catch {}
  }
  const id = process.env.ADMIN_LINE_USER_ID;
  if (!id) return [];
  return [{
    id,
    name: process.env.ADMIN_LINE_USER_LABEL ?? "管理員",
    role: process.env.ADMIN_LINE_USER_ROLE ?? "董事長",
  }];
}

export function getAdminLineUser(lineUserId: string): AdminLineUser | null {
  return getAdminLineUsers().find((u) => u.id === lineUserId) ?? null;
}

export function isLineAdmin(lineUserId: string): boolean {
  return getAdminLineUser(lineUserId) !== null;
}
