/**
 * 林董 / 平台 Owner 身份識別 — 中央邏輯
 *
 * 不要散在多處判斷、所有 AI / 後台 / LINE bot 都用這個 helper。
 *
 * 多重 signal 任一命中就算 owner、回傳哪些 signal 命中 (透明度)：
 *   1. profile.role === 'owner'
 *   2. profile.username 在 OWNER_USERNAMES list (env: OWNER_USERNAMES、預設 'luffysky00,luffysky004')
 *   3. profile.id 在 OWNER_USER_IDS list (env: OWNER_USER_IDS)
 *   4. auth.users.email 在 OWNER_EMAILS (env: OWNER_EMAILS、預設 'luffysky00@gmail.com')
 *   5. LINE userId 在 ADMIN_LINE_USERS 且 role 含「董事 / Owner / 林董」
 *
 * Why 多 signal：
 *   - DB role 可能被誤改 (例如降級)
 *   - email 可能要 JOIN auth.users 才拿到 (profiles 沒此欄位)
 *   - LINE 上沒 profile.id、要靠 LINE userId
 *   - 任何一條斷了還有其他 fallback、不會誤殺
 */

export type OwnerCheckInput = {
  role?: string | null;
  username?: string | null;
  id?: string | null;          // profile.id (UUID)
  email?: string | null;       // auth.users.email
  lineUserId?: string | null;  // 從 LINE bot event 來
  lineRole?: string | null;    // 從 ADMIN_LINE_USERS 設定的 role 欄位
};

export type OwnerCheckResult = {
  isOwner: boolean;
  signals: {
    role: boolean;
    username: boolean;
    userId: boolean;
    email: boolean;
    lineUser: boolean;
    lineRole: boolean;
  };
  reasons: string[];           // 命中的理由 (給 UI / debug 顯示)
};

function csv(v: string | undefined): string[] {
  return (v ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

export function getOwnerConfig() {
  return {
    usernames: csv(process.env.OWNER_USERNAMES) ?? [],
    userIds: csv(process.env.OWNER_USER_IDS) ?? [],
    emails: (csv(process.env.OWNER_EMAILS).length > 0
      ? csv(process.env.OWNER_EMAILS)
      : ["luffysky00@gmail.com"]),
    defaultUsernames: ["luffysky00", "luffysky004"], // 安全 fallback、就算 env 沒設也認得林董
  };
}

export function checkOwner(input: OwnerCheckInput): OwnerCheckResult {
  const cfg = getOwnerConfig();
  const usernameLower = (input.username ?? "").toLowerCase();
  const emailLower = (input.email ?? "").toLowerCase();
  const userIdLower = (input.id ?? "").toLowerCase();
  const lineRoleStr = (input.lineRole ?? "").toLowerCase();

  const usernameInList =
    cfg.usernames.includes(usernameLower) ||
    cfg.defaultUsernames.some((u) => usernameLower === u || usernameLower.startsWith(u + "_"));

  const signals = {
    role: input.role === "owner",
    username: !!usernameLower && usernameInList,
    userId: !!userIdLower && cfg.userIds.includes(userIdLower),
    email: !!emailLower && cfg.emails.includes(emailLower),
    lineUser: !!input.lineUserId, // 在 admin LINE 白名單內 (caller 已驗)
    lineRole: !!lineRoleStr && (
      lineRoleStr.includes("董事") ||
      lineRoleStr.includes("owner") ||
      lineRoleStr.includes("林董") ||
      lineRoleStr === "boss" ||
      lineRoleStr === "ceo"
    ),
  };

  // lineUser 單獨不算 owner (一般 admin 也在白名單)、要配 lineRole
  const reasons: string[] = [];
  if (signals.role) reasons.push("profile.role = 'owner'");
  if (signals.username) reasons.push(`profile.username = ${input.username}`);
  if (signals.userId) reasons.push(`profile.id 在 OWNER_USER_IDS env list`);
  if (signals.email) reasons.push(`auth.users.email = ${input.email}`);
  if (signals.lineRole) reasons.push(`LINE role 含「董事/Owner/林董」(${input.lineRole})`);

  // 任一命中即為 owner — 但 lineUser 單獨不算
  const isOwner =
    signals.role ||
    signals.username ||
    signals.userId ||
    signals.email ||
    signals.lineRole;

  return { isOwner, signals, reasons };
}

/**
 * 給 server component 用：
 *   const supabase = createSupabaseAdmin();
 *   const profile = await supabase.from("profiles")...
 *   const { isOwner, reasons } = await checkOwnerByProfileId(profile.id, supabase);
 *
 * 自動 JOIN auth.users 拿 email、不用 caller 自己拉。
 */
export async function checkOwnerByProfileId(
  profileId: string,
  supabase: any,
): Promise<OwnerCheckResult> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, role")
    .eq("id", profileId)
    .maybeSingle();

  if (!profile) return { isOwner: false, signals: emptySignals(), reasons: [] };

  // JOIN auth.users 拿 email (用 auth.admin API)
  let email: string | null = null;
  try {
    const { data: authUser } = await supabase.auth.admin.getUserById(profileId);
    email = authUser?.user?.email ?? null;
  } catch {}

  return checkOwner({
    id: profile.id,
    username: profile.username,
    role: profile.role,
    email,
  });
}

function emptySignals() {
  return { role: false, username: false, userId: false, email: false, lineUser: false, lineRole: false };
}

/** 林董稱呼 — UI / AI 用 */
export const OWNER_NAME_TW = "林董";
export const OWNER_NAME_FULL = "Luffy Lin (林董)";
