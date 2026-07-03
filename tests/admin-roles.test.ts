import { describe, it, expect } from "vitest";
import {
  sectionForPath,
  canAccessSection,
  canAccessPath,
  landingPathForRole,
  isAdminStaff,
  isScopedRole,
  SCOPED_ROLES,
  type AdminSectionKey,
} from "@/lib/admin-roles";

const SECTIONS: AdminSectionKey[] = ["support", "marketing", "finance", "content"];

describe("sectionForPath", () => {
  it("maps representative paths of each section", () => {
    expect(sectionForPath("/admin/tickets")).toBe("support");
    expect(sectionForPath("/admin/crm/123")).toBe("support");
    expect(sectionForPath("/admin/marketing")).toBe("marketing");
    expect(sectionForPath("/admin/email/campaign/5")).toBe("marketing");
    expect(sectionForPath("/admin/orders")).toBe("finance");
    expect(sectionForPath("/admin/zcoin")).toBe("finance");
    expect(sectionForPath("/admin/chapters")).toBe("content");
    expect(sectionForPath("/admin/ai/moderation")).toBe("content");
  });

  it("returns null for admin-only paths (users / settings / env)", () => {
    expect(sectionForPath("/admin")).toBeNull();
    expect(sectionForPath("/admin/users")).toBeNull();
    expect(sectionForPath("/admin/settings")).toBeNull();
    expect(sectionForPath("/admin/env")).toBeNull();
  });

  it("does not confuse a longer sibling path (/admin/ab vs /admin/abc)", () => {
    expect(sectionForPath("/admin/ab")).toBe("marketing"); // /admin/ab is a real prefix
    expect(sectionForPath("/admin/abc")).toBeNull(); // must NOT match /admin/ab
  });

  it("normalizes a slug-prefixed path and strips query/hash", () => {
    expect(sectionForPath("/console-x7k2/admin/orders?tab=1")).toBe("finance");
    expect(sectionForPath("/admin/chapters#top")).toBe("content");
  });

  it("returns null for null/empty/non-admin paths", () => {
    expect(sectionForPath(null)).toBeNull();
    expect(sectionForPath(undefined)).toBeNull();
    expect(sectionForPath("")).toBeNull();
    expect(sectionForPath("/store")).toBeNull();
  });
});

describe("canAccessSection — full RBAC matrix (no privilege escalation)", () => {
  it("owner is allowed into every section AND admin-only (null)", () => {
    for (const s of [...SECTIONS, null]) {
      expect(canAccessSection("finance", true, s)).toBe(true); // isOwner overrides role
      expect(canAccessSection(null, true, s)).toBe(true);
    }
  });

  it("admin role is allowed into every section AND admin-only (null)", () => {
    for (const s of [...SECTIONS, null]) {
      expect(canAccessSection("admin", false, s)).toBe(true);
    }
  });

  it("each scoped role is allowed ONLY into its own section", () => {
    for (const role of SCOPED_ROLES) {
      for (const s of SECTIONS) {
        const expected = role === s;
        expect(canAccessSection(role, false, s)).toBe(expected);
      }
      // scoped roles never get into admin-only (null) sections
      expect(canAccessSection(role, false, null)).toBe(false);
    }
  });

  it("unknown / null role with no ownership is denied everywhere", () => {
    for (const s of [...SECTIONS, null]) {
      expect(canAccessSection(null, false, s)).toBe(false);
      expect(canAccessSection("random", false, s)).toBe(false);
    }
  });
});

describe("canAccessPath", () => {
  it("finance staff can open /admin/orders but not /admin/chapters or /admin/users", () => {
    expect(canAccessPath("finance", false, "/admin/orders")).toBe(true);
    expect(canAccessPath("finance", false, "/admin/chapters")).toBe(false);
    expect(canAccessPath("finance", false, "/admin/users")).toBe(false);
  });
  it("owner can open anything", () => {
    expect(canAccessPath(null, true, "/admin/users")).toBe(true);
    expect(canAccessPath(null, true, "/admin/chapters")).toBe(true);
  });
});

describe("landingPathForRole", () => {
  it("owner/admin land on /admin dashboard", () => {
    expect(landingPathForRole(null, true)).toBe("/admin");
    expect(landingPathForRole("admin", false)).toBe("/admin");
  });
  it("scoped roles land on their own section home", () => {
    expect(landingPathForRole("support", false)).toBe("/admin/tickets");
    expect(landingPathForRole("marketing", false)).toBe("/admin/marketing");
    expect(landingPathForRole("finance", false)).toBe("/admin/orders");
    expect(landingPathForRole("content", false)).toBe("/admin/chapters");
  });
  it("unknown role falls back to /admin", () => {
    expect(landingPathForRole("nobody", false)).toBe("/admin");
  });
});

describe("isAdminStaff / isScopedRole", () => {
  it("isAdminStaff true for owner and any known role, false otherwise", () => {
    expect(isAdminStaff(null, true)).toBe(true);
    expect(isAdminStaff("content", false)).toBe(true);
    expect(isAdminStaff("owner", false)).toBe(true);
    expect(isAdminStaff("stranger", false)).toBe(false);
    expect(isAdminStaff(null, false)).toBe(false);
  });
  it("isScopedRole true only for the four scoped roles", () => {
    expect(isScopedRole("finance")).toBe(true);
    expect(isScopedRole("owner")).toBe(false);
    expect(isScopedRole("admin")).toBe(false);
    expect(isScopedRole(null)).toBe(false);
  });
});
