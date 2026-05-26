"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/auth-context";
import { Flame, Coins, Heart, LogOut, Settings, Trophy, User as UserIcon, ChevronDown, Menu, X } from "lucide-react";
import { TodoDropdownButton } from "@/components/todo/TodoDropdown";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { NotificationsDropdown } from "@/components/layout/NotificationsDropdown";
import { usePopover, PopoverPanel } from "@/components/ui/Popover";
import { devLog } from "@/lib/dev-log";

const NAV_LINKS = [
  { href: "/chapters", label: "章節" },
  { href: "/courses", label: "副本" },
  { href: "/forum", label: "討論區" },
  { href: "/blogs", label: "部落格" },
  { href: "/leaderboard", label: "排行榜" },
  { href: "/career", label: "職業路線" },
];

export function TopNav() {
  // 用全站 AuthContext、不再各自 race
  const { user, profile } = useAuth();
  const userMenu = usePopover({ placement: "bottom-end", maxWidth: 280 });
  const { open, setOpen } = userMenu;
  const [mobileMenu, setMobileMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const supabase = createSupabaseBrowser();

  const displayProfile = profile ?? {
    username: user?.email?.split("@")[0] ?? "AI 島民",
    display_name: user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name,
    avatar_url: user?.user_metadata?.avatar_url || user?.user_metadata?.picture,
    streak_days: 0,
    z_coin: 0,
    hearts: 5,
    level: 1,
    role: "member",
  };

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setOpen(false);
    setMobileMenu(false);
    // AuthContext 會收到 SIGNED_OUT event 自動清掉 user/profile

    try {
      await Promise.race([
        supabase.auth.signOut({ scope: "local" }),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
      const res = await fetch("/api/auth/logout", {
      credentials: "include", method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        devLog.error("[Logout] server signOut failed:", body);
      }
    } catch (error) {
      devLog.error("[Logout] failed:", error);
    } finally {
      window.location.replace("/");
    }
  }

  return (
    <nav className="sticky top-0 z-40 bg-bg/90 backdrop-blur border-b border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenu((value) => !value)}
            className="md:hidden p-2 -ml-2 rounded-lg hover:bg-bg-card"
            aria-label={mobileMenu ? "關閉導覽選單" : "開啟導覽選單"}
          >
            {mobileMenu ? <X size={18} /> : <Menu size={18} />}
          </button>
          <Link href="/" className="flex items-center gap-2 font-bold text-lg" onClick={() => setMobileMenu(false)}>
            <span>🏝️</span>
            <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">AI 島</span>
          </Link>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="hidden md:flex items-center gap-4">
            {NAV_LINKS.map((item) => (
              <Link key={item.href} href={item.href as any} className="hover:text-accent">
                {item.label}
              </Link>
            ))}
          </div>

          {user ? (
            <>
              <div className="hidden md:flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1" title="連勝">
                  <Flame size={14} className="text-orange-400" />
                  {displayProfile.streak_days ?? 0}
                </span>
                <span className="flex items-center gap-1" title="Z-coin">
                  <Coins size={14} className="text-yellow-400" />
                  {displayProfile.z_coin ?? 0}
                </span>
                <span className="flex items-center gap-1" title="生命">
                  <Heart size={14} className="text-red-400" />
                  {displayProfile.hearts ?? 5}
                </span>
              </div>

              {/* 主題切換 */}
              <div className="hidden md:block"><ThemeToggle /></div>

              {/* 通知中心 */}
              <NotificationsDropdown />

              {/* TODO list 入口 */}
              <TodoDropdownButton />

              <div>
                <button
                  ref={userMenu.refs.setReference}
                  {...userMenu.getReferenceProps()}
                  className="flex items-center gap-2 px-3 py-1.5 bg-bg-card rounded-lg hover:bg-border transition"
                >
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gradient-to-r from-accent to-accent-2 text-black font-bold">
                    Lv {displayProfile.level ?? 1}
                  </span>
                  <span className="hidden md:inline">{displayProfile.display_name || displayProfile.username}</span>
                  <ChevronDown size={14} className={`transition ${open ? 'rotate-180' : ''}`} />
                </button>

                <PopoverPanel api={userMenu} className="w-56 py-1">
                    {/* 顯示頭像 + 資訊 */}
                    <div className="px-4 py-3 border-b border-border">
                      <div className="flex items-center gap-3">
                        {displayProfile.avatar_url ? (
                          <Image
                            src={displayProfile.avatar_url}
                            alt=""
                            width={40}
                            height={40}
                            unoptimized
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center font-bold text-black">
                            {(displayProfile.display_name || displayProfile.username || "U")[0].toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{displayProfile.display_name || displayProfile.username}</div>
                          <div className="text-xs text-fg-muted truncate">{user.email}</div>
                          <div className="text-[10px] mt-0.5">
                            <span
                              className={`px-1.5 py-0.5 rounded ${
                                displayProfile.role === "owner"
                                  ? "bg-gradient-to-r from-yellow-400 to-pink-400 text-black font-bold"
                                  : displayProfile.role === "admin"
                                  ? "bg-red-500/20 text-red-300"
                                  : displayProfile.role === "editor"
                                  ? "bg-blue-500/20 text-blue-300"
                                  : "bg-gray-500/20 text-gray-300"
                              }`}
                            >
                              {displayProfile.role === "owner" ? "👑 owner" : (displayProfile.role || "member")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Link
                      href="/me"
                      className="flex items-center gap-3 px-4 py-2 hover:bg-bg-elevated transition"
                      onClick={() => setOpen(false)}
                    >
                      <Trophy size={16} className="text-accent" />
                      <span>我的學習後台</span>
                    </Link>

                    <Link
                      href="/me/history"
                      className="flex items-center gap-3 px-4 py-2 hover:bg-bg-elevated transition text-sm text-fg-muted"
                      onClick={() => setOpen(false)}
                    >
                      <span className="ml-7">📊 學習進度</span>
                    </Link>

                    <Link
                      href="/profile"
                      className="flex items-center gap-3 px-4 py-2 hover:bg-bg-elevated transition"
                      onClick={() => setOpen(false)}
                    >
                      <UserIcon size={16} />
                      <span>個人資料</span>
                    </Link>

                    <Link
                      href="/settings"
                      className="flex items-center gap-3 px-4 py-2 hover:bg-bg-elevated transition"
                      onClick={() => setOpen(false)}
                    >
                      <Settings size={16} />
                      <span>設定</span>
                    </Link>

                    {(displayProfile.role === "admin" || displayProfile.role === "owner") && (
                      <Link
                        href={`/${process.env.NEXT_PUBLIC_ADMIN_SLUG || "console-x7k2"}/admin` as any}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-bg-elevated transition text-warning"
                        onClick={() => setOpen(false)}
                      >
                        <Settings size={16} />
                        <span>{displayProfile.role === "owner" ? "👑 平台後台 (林董)" : "後台管理"}</span>
                      </Link>
                    )}

                    <div className="border-t border-border mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-bg-elevated transition text-red-400"
                      >
                        <LogOut size={16} />
                        <span>{loggingOut ? "登出中..." : "登出"}</span>
                      </button>
                    </div>
                </PopoverPanel>
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="text-fg-muted hover:text-accent">登入</Link>
              <Link href="/signup" className="px-4 py-1.5 bg-accent text-black rounded-lg font-semibold hover:bg-accent-2">註冊</Link>
            </>
          )}
        </div>
      </div>

      {mobileMenu && (
        <div className="md:hidden border-t border-border bg-bg px-4 py-3">
          <div className="flex flex-col gap-1 text-sm">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href as any}
                className="rounded-lg px-3 py-2 hover:bg-bg-card hover:text-accent"
                onClick={() => setMobileMenu(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
