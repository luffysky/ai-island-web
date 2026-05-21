"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { Flame, Coins, Heart, LogOut, Settings, Trophy, User as UserIcon, ChevronDown, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/chapters", label: "章節" },
  { href: "/courses", label: "副本" },
  { href: "/forum", label: "討論區" },
  { href: "/blogs", label: "部落格" },
  { href: "/leaderboard", label: "排行榜" },
  { href: "/career", label: "職業路線" },
];

export function TopNav() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        setProfile(data);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
        setProfile(data);
      } else {
        setProfile(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // 點外面關閉 dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setOpen(false);
    setMobileMenu(false);
    setUser(null);
    setProfile(null);

    try {
      await Promise.race([
        supabase.auth.signOut({ scope: "local" }),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("[Logout] server signOut failed:", body);
      }
    } catch (error) {
      console.error("[Logout] failed:", error);
    } finally {
      window.location.replace("/");
    }
  }

  return (
    <nav className="sticky top-0 z-40 bg-[var(--color-bg)]/90 backdrop-blur border-b border-[var(--color-border)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenu((value) => !value)}
            className="md:hidden p-2 -ml-2 rounded-lg hover:bg-[var(--color-bg-card)]"
            aria-label={mobileMenu ? "關閉導覽選單" : "開啟導覽選單"}
          >
            {mobileMenu ? <X size={18} /> : <Menu size={18} />}
          </button>
          <Link href="/" className="flex items-center gap-2 font-bold text-lg" onClick={() => setMobileMenu(false)}>
            <span>🏝️</span>
            <span className="bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)] bg-clip-text text-transparent">AI 島</span>
          </Link>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="hidden md:flex items-center gap-4">
            {NAV_LINKS.map((item) => (
              <Link key={item.href} href={item.href as any} className="hover:text-[var(--color-accent)]">
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

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setOpen(!open)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[var(--color-bg-card)] rounded-lg hover:bg-[var(--color-border)] transition"
                >
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)] text-black font-bold">
                    Lv {displayProfile.level ?? 1}
                  </span>
                  <span className="hidden md:inline">{displayProfile.display_name || displayProfile.username}</span>
                  <ChevronDown size={14} className={`transition ${open ? 'rotate-180' : ''}`} />
                </button>

                {open && (
                  <div className="absolute right-0 mt-2 w-56 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg shadow-xl py-1 z-50">
                    {/* 顯示頭像 + 資訊 */}
                    <div className="px-4 py-3 border-b border-[var(--color-border)]">
                      <div className="flex items-center gap-3">
                        {displayProfile.avatar_url ? (
                          <img src={displayProfile.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-2)] flex items-center justify-center font-bold text-black">
                            {(displayProfile.display_name || displayProfile.username || "U")[0].toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate">{displayProfile.display_name || displayProfile.username}</div>
                          <div className="text-xs text-[var(--color-fg-muted)] truncate">{user.email}</div>
                        </div>
                      </div>
                    </div>

                    <Link
                      href="/me"
                      className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-bg-elevated)] transition"
                      onClick={() => setOpen(false)}
                    >
                      <Trophy size={16} className="text-[var(--color-accent)]" />
                      <span>我的學習後台</span>
                    </Link>

                    <Link
                      href="/dashboard"
                      className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-bg-elevated)] transition text-sm text-[var(--color-fg-muted)]"
                      onClick={() => setOpen(false)}
                    >
                      <span className="ml-7">📊 學習進度</span>
                    </Link>

                    <Link
                      href="/profile"
                      className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-bg-elevated)] transition"
                      onClick={() => setOpen(false)}
                    >
                      <UserIcon size={16} />
                      <span>個人資料</span>
                    </Link>

                    <Link
                      href="/settings"
                      className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-bg-elevated)] transition"
                      onClick={() => setOpen(false)}
                    >
                      <Settings size={16} />
                      <span>設定</span>
                    </Link>

                    {displayProfile.role === "admin" && (
                      <Link
                        href={`/${process.env.NEXT_PUBLIC_ADMIN_SLUG || "console-x7k2"}/admin` as any}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-bg-elevated)] transition text-[var(--color-warning)]"
                        onClick={() => setOpen(false)}
                      >
                        <Settings size={16} />
                        <span>後台管理</span>
                      </Link>
                    )}

                    <div className="border-t border-[var(--color-border)] mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-bg-elevated)] transition text-red-400"
                      >
                        <LogOut size={16} />
                        <span>{loggingOut ? "登出中..." : "登出"}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="text-[var(--color-fg-muted)] hover:text-[var(--color-accent)]">登入</Link>
              <Link href="/signup" className="px-4 py-1.5 bg-[var(--color-accent)] text-black rounded-lg font-semibold hover:bg-[var(--color-accent-2)]">註冊</Link>
            </>
          )}
        </div>
      </div>

      {mobileMenu && (
        <div className="md:hidden border-t border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3">
          <div className="flex flex-col gap-1 text-sm">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href as any}
                className="rounded-lg px-3 py-2 hover:bg-[var(--color-bg-card)] hover:text-[var(--color-accent)]"
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
