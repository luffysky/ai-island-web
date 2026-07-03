/**
 * 後台 RBAC（scoped admin roles）— 純資料 / 純函式、無 server 依賴。
 *
 * 這是「網站後台」(/admin) 的角色模型、單一 source of truth。
 * ⚠️ 跟 Creator-Island workspace 角色系統（ci_workspace_members /
 *    requireWorkspaceRole：owner/manager/contributor/viewer）**完全無關**、別混。
 *
 * 兩層角色：
 *   - owner / admin → 全站完整權限（fail-open、永遠放行）。
 *   - support / marketing / finance / content → scoped（fail-closed、
 *     只在自己負責的「區塊 section」內有權限，其他一律擋）。
 *
 * 設計原則：
 *   - `sectionForPath()` 是唯一的 path→section 判定；nav 顯示與 layout 頁面 gate
 *     都吃它、保證「看得到的 = 進得去的」。
 *   - 沒對應到任何 scoped section 的路徑 → 視為 admin/owner-only。
 *   - `canAccessSection()`：owner/admin 一律 true；scoped 角色只有自己那個 section true。
 */

/** 後台所有合法角色（profiles.role 是自由 TEXT、這是白名單）。 */
export const ADMIN_ROLES = [
  "owner",
  "admin",
  "support",
  "marketing",
  "finance",
  "content",
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

/** 有權限「進後台」的角色（全部 6 個）。owner/admin 全權、scoped 只進自己 section。 */
export const ADMIN_STAFF_ROLES = ADMIN_ROLES;

/** scoped（受限）角色 — 不含 owner/admin。 */
export const SCOPED_ROLES = ["support", "marketing", "finance", "content"] as const;
export type ScopedRole = (typeof SCOPED_ROLES)[number];

export type AdminSectionKey = "support" | "marketing" | "finance" | "content";

export type AdminSectionDef = {
  /** 中文說明（給角色說明 legend 用）。 */
  label: string;
  /** owner/admin 以外、還能存取此 section 的 scoped 角色。 */
  allowedRoles: ScopedRole[];
  /** 屬於此 section 的內部路徑前綴（/admin/...）。 */
  prefixes: string[];
  /** scoped 角色進後台後的預設落地頁（該 section 首頁）。 */
  landing: string;
};

/**
 * Section 定義。key = scoped 角色名（一角色一 section，v1 一對一）。
 * prefixes 用「整段」比對（=prefix 或以 prefix + "/" 開頭），不會誤中 /admin/abc。
 *
 * ⚠️ 只列 scoped section 的路徑；沒列到的（users / settings / env / flags /
 *    audit / ai keys / ga4 / kpi / health / rate-limits …）= admin/owner-only。
 */
export const ADMIN_SECTIONS: Record<AdminSectionKey, AdminSectionDef> = {
  support: {
    label: "客服 / 工單（工單、CRM、罐頭訊息）",
    allowedRoles: ["support"],
    prefixes: ["/admin/tickets", "/admin/crm", "/admin/line/canned"],
    landing: "/admin/tickets",
  },
  marketing: {
    label: "行銷（行銷主控台、Email、站內公告、Segments、A/B、更新日誌）",
    allowedRoles: ["marketing"],
    prefixes: [
      "/admin/marketing",
      "/admin/email",
      "/admin/broadcasts",
      "/admin/segments",
      "/admin/ab",
      "/admin/changelog",
    ],
    landing: "/admin/marketing",
  },
  finance: {
    label: "財務 / 金流（訂單、訂閱、Z-coin）",
    allowedRoles: ["finance"],
    prefixes: [
      "/admin/orders",
      "/admin/finance",
      "/admin/subscriptions",
      "/admin/zcoin",
    ],
    landing: "/admin/orders",
  },
  content: {
    label: "內容 / 審核（章節、留言/論壇審核、檢舉、AI 審核、點子碎片）",
    allowedRoles: ["content"],
    prefixes: [
      "/admin/chapters",
      "/admin/moderation",
      "/admin/reports",
      "/admin/ai/moderation",
      "/admin/idea-fragments",
    ],
    landing: "/admin/chapters",
  },
};

/** 一段路徑是否落在某 prefix 內（整段比對、避免 /admin/ab 誤中 /admin/abc）。 */
function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

/**
 * 把後台內部路徑（/admin/...）對應到 scoped section。
 * 對不到任何 scoped section → null（代表 admin/owner-only）。
 * 傳進來的 path 可含或不含 slug；會先正規化成 /admin/... 內部路徑。
 */
export function sectionForPath(pathname: string | null | undefined): AdminSectionKey | null {
  if (!pathname) return null;
  // 去掉 query / hash
  let p = pathname.split("?")[0].split("#")[0];
  // 正規化：把 /{slug}/admin/... 收斂回 /admin/...
  const idx = p.indexOf("/admin");
  if (idx > 0) p = p.slice(idx);
  if (!p.startsWith("/admin")) return null;

  for (const key of Object.keys(ADMIN_SECTIONS) as AdminSectionKey[]) {
    for (const prefix of ADMIN_SECTIONS[key].prefixes) {
      if (matchesPrefix(p, prefix)) return key;
    }
  }
  return null;
}

/**
 * 能否存取某 section。
 *   - owner / admin → 永遠 true（fail-open）。
 *   - section == null（admin-only 區）→ scoped 角色一律 false。
 *   - scoped 角色 → 只有自己在 allowedRoles 內才 true。
 */
export function canAccessSection(
  role: string | null | undefined,
  isOwner: boolean,
  section: AdminSectionKey | null,
): boolean {
  if (isOwner || role === "admin") return true;
  if (!section) return false;
  const def = ADMIN_SECTIONS[section];
  if (!def) return false;
  return def.allowedRoles.includes(role as ScopedRole);
}

/** 能否存取某條路徑（sectionForPath + canAccessSection 的組合）。 */
export function canAccessPath(
  role: string | null | undefined,
  isOwner: boolean,
  pathname: string | null | undefined,
): boolean {
  if (isOwner || role === "admin") return true;
  return canAccessSection(role, isOwner, sectionForPath(pathname));
}

/** 是否為（任一）後台工作人員角色 → 允許進後台 layout。 */
export function isAdminStaff(role: string | null | undefined, isOwner: boolean): boolean {
  if (isOwner) return true;
  return !!role && (ADMIN_ROLES as readonly string[]).includes(role);
}

/** 是否為 scoped（受限）角色。 */
export function isScopedRole(role: string | null | undefined): role is ScopedRole {
  return !!role && (SCOPED_ROLES as readonly string[]).includes(role);
}

/**
 * scoped 角色的落地頁（進後台後 / 被擋下時 redirect 去的地方）。
 * owner/admin 用 /admin dashboard；scoped 用自己 section 首頁。
 */
export function landingPathForRole(role: string | null | undefined, isOwner: boolean): string {
  if (isOwner || role === "admin") return "/admin";
  for (const key of Object.keys(ADMIN_SECTIONS) as AdminSectionKey[]) {
    if (ADMIN_SECTIONS[key].allowedRoles.includes(role as ScopedRole)) {
      return ADMIN_SECTIONS[key].landing;
    }
  }
  return "/admin";
}

/** 角色說明 legend（給 users 頁 / dashboard 顯示）。 */
export const ROLE_LEGEND: { role: AdminRole; label: string; desc: string }[] = [
  { role: "owner", label: "站長 (Owner)", desc: "全站最高權限。只有 owner 能授予/撤銷 owner 與 admin。" },
  { role: "admin", label: "超級管理員 (Admin)", desc: "後台完整權限（等同 owner 的操作面，除授予 owner/admin 外）。" },
  { role: "support", label: "客服 (Support)", desc: ADMIN_SECTIONS.support.label },
  { role: "marketing", label: "行銷 (Marketing)", desc: ADMIN_SECTIONS.marketing.label },
  { role: "finance", label: "財務 (Finance)", desc: ADMIN_SECTIONS.finance.label },
  { role: "content", label: "內容 (Content)", desc: ADMIN_SECTIONS.content.label },
];
