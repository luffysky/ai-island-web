import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { CollapsibleAside } from "./CollapsibleAside";
import { LottieBackground } from "@/components/admin/LottieBackground";
import { DeployVersionBadge } from "@/components/admin/DeployVersionBadge";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { checkOwner, OWNER_NAME_TW } from "@/lib/is-owner";
import { NavGroup } from "./NavGroup";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Crown, ArrowLeft } from "lucide-react";
import { ADMIN_NAV_TOP, ADMIN_NAV_GROUPS } from "./nav-items";
import { CommandPalette } from "@/components/admin/CommandPalette";
import { ADMIN_BASE, ADMIN_SLUG } from "@/lib/admin-href";
import {
  isAdminStaff,
  isScopedRole,
  canAccessPath,
  canAccessSection,
  sectionForPath,
  landingPathForRole,
} from "@/lib/admin-roles";

// 強制每次都 server-side render、不 cache
export const dynamic = "force-dynamic";
export const revalidate = 0;


export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer();

  // 用 getUser 確保 token 有被 supabase server 驗證（不是只看 cookie）
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/login?next=${encodeURIComponent(ADMIN_BASE)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, username, avatar_url, display_name, is_owner")
    .eq("id", user.id)
    .single();

  // 用中央 isOwner helper 多重 signal 判斷 (is_owner 旗標優先、再 fallback role/username/email)
  const ownerCheck = checkOwner({
    id: user.id,
    username: profile?.username ?? null,
    role: profile?.role ?? null,
    isOwner: (profile as any)?.is_owner ?? null,
    email: user.email ?? null,
  });
  const isOwner = ownerCheck.isOwner;
  const role = profile?.role ?? null;

  // 進後台的資格：owner / admin / scoped 角色（support/marketing/finance/content）都可進。
  // owner/admin = 全權；scoped 角色只能看/進自己負責的 section（下面 gate）。
  if (!profile || !isAdminStaff(role, isOwner)) {
    redirect("/");
  }

  // === RBAC 頁面 gate（單一入口涵蓋所有 admin 頁）===
  // 從 middleware 塞的 x-admin-path 取當前內部路徑；scoped 角色進不了的 section → 導回自己落地頁。
  const scoped = isScopedRole(role) && !isOwner;
  const currentPath = (await headers()).get("x-admin-path") || "/admin";
  if (scoped && !canAccessPath(role, isOwner, currentPath)) {
    redirect(landingPathForRole(role, isOwner).replace(/^\/admin/, ADMIN_BASE));
  }

  // 後台 Lottie 背景設定 (從 app_settings 撈、林董可在「應用設定 CRUD」調)
  let lottieSrc: string | null = null;
  let lottieOpacity = 0.12;
  try {
    const admin = createSupabaseAdmin();
    const { data: settings } = await admin
      .from("app_settings")
      .select("key, value")
      .in("key", ["admin_lottie_url", "admin_lottie_opacity"]);
    for (const s of (settings as any[]) ?? []) {
      if (s.key === "admin_lottie_url" && s.value) lottieSrc = String(s.value);
      if (s.key === "admin_lottie_opacity" && s.value) lottieOpacity = Number(s.value);
    }
  } catch {}

  return (
    <div className="admin-skin relative">
      <LottieBackground src={lottieSrc ?? undefined} opacity={lottieOpacity} blur={1} speed={0.4} />
      <CommandPalette isOwner={isOwner} role={role} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 relative z-10">
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap bg-bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center text-white text-lg shadow-lg">
              🌸
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold flex items-center gap-2 whitespace-nowrap">
                AI 島 · 後台
                {isOwner && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-yellow-400 to-pink-400 text-black font-bold cursor-help inline-flex items-center gap-1"
                    title={`👑 Owner 識別命中: ${ownerCheck.reasons.join(" / ") || "(無、可能 bug)"}`}
                  >
                    <Crown className="w-3 h-3" /> OWNER
                  </span>
                )}
              </h1>
              <p className="text-xs text-fg-muted">
                哈囉 {isOwner ? OWNER_NAME_TW : (profile?.display_name || profile?.username)} ✨
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {isOwner && <DeployVersionBadge />}
            <Link
              href="/"
              className="text-sm text-fg-muted hover:text-accent transition px-3 py-1.5 rounded-full hover:bg-bg-elevated inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> 回前台
            </Link>
          </div>
        </div>

      <div className="flex gap-2 md:gap-6">
        <CollapsibleAside>
          <nav className="space-y-4 text-sm">

            {/* ⭐ 置頂、不歸類 — scoped 角色也要過 section 權限 */}
            {ADMIN_NAV_TOP
              .filter((it) => (!it.ownerOnly || isOwner) && canAccessSection(role, isOwner, sectionForPath(it.href)))
              .map((it) => (
                <AdminLink key={it.href} href={it.href} active={currentPath === it.href}>{it.label}</AdminLink>
              ))}

            {/* 側邊欄與 Cmd+K 指令面板共用 ./nav-items.ts 這一份資料。
                RBAC：每個項目用 sectionForPath 判定 section、scoped 角色只看得到自己 section。
                group 內全數被過濾掉時整組不顯示。 */}
            {ADMIN_NAV_GROUPS.map((g) => {
              const visible = g.items.filter(
                (it) =>
                  (!it.ownerOnly || isOwner) &&
                  canAccessSection(role, isOwner, sectionForPath(it.href)),
              );
              if (visible.length === 0) return null;
              return (
                <NavGroup key={g.title} title={g.title}>
                  {visible.map((it) => (
                    <AdminLink key={it.href} href={it.href} active={currentPath === it.href}>{it.label}</AdminLink>
                  ))}
                </NavGroup>
              );
            })}

          </nav>
        </CollapsibleAside>
        <div className="flex-1 min-w-0">
          <Breadcrumbs className="!px-0 mb-3" />
          {children}
        </div>
      </div>
      </div>
    </div>
  );
}

// NavGroup 抽到 ./NavGroup.tsx (client component、可折疊 + localStorage 記憶)

function AdminLink({ href, children, active }: { href: string; children: React.ReactNode; active?: boolean }) {
  const publicHref = href === "/admin" ? ADMIN_BASE : href.replace(/^\/admin/, ADMIN_BASE);

  return (
    <Link
      href={publicHref as any}
      aria-current={active ? "page" : undefined}
      className={`block px-3 py-2 rounded-full transition-all ${
        active
          ? "bg-accent/12 text-accent font-semibold shadow-sm"
          : "text-fg-muted hover:bg-bg-elevated hover:text-accent hover:translate-x-0.5"
      }`}
    >
      {children}
    </Link>
  );
}
