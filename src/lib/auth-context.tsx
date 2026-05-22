"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

/**
 * 全站共用 auth state。
 *
 * 解決多個元件各自 `getSession()` 或 `onAuthStateChange()` 時序錯亂
 * 導致「TopNav 看得到登入 / AI tutor 抓不到」這種狀況。
 *
 * 原則：
 *   - 一個 provider、一個 listener、一個來源
 *   - 初始用 getSession（cookie cache、不丟錯）
 *   - 監聽 onAuthStateChange、只在 SIGNED_OUT 明確清空
 *   - profile 在 user 變動時 lazy 載入、localStorage 暫存避免閃爍
 *
 * 任何 client component 用 `useAuth()` 拿到 { user, profile, status }
 * status: "loading" / "in" / "out"
 */

export type Profile = {
  id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  level?: number | null;
  xp?: number | null;
  z_coin?: number | null;
  streak_days?: number | null;
  hearts?: number | null;
};

export type AuthState = {
  user: User | null;
  profile: Profile | null;
  status: "loading" | "in" | "out";
  refreshProfile: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | null>(null);

const PROFILE_CACHE_KEY = "ai-island-profile-cache";

function readCachedProfile(): Profile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

function writeCachedProfile(p: Profile | null) {
  if (typeof window === "undefined") return;
  try {
    if (p) localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(p));
    else localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createSupabaseBrowser(), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(() => readCachedProfile());
  const [status, setStatus] = useState<"loading" | "in" | "out">("loading");

  const loadProfile = async (uid: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, username, display_name, avatar_url, role, level, xp, z_coin, streak_days, hearts",
      )
      .eq("id", uid)
      .maybeSingle();
    if (error) {
      console.warn("[auth] profile load failed:", error.message);
      return;
    }
    if (data) {
      setProfile(data);
      writeCachedProfile(data);
    }
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        setStatus("in");
        loadProfile(session.user.id);
      } else {
        // 沒 session 就清 cache、避免登出後 cached profile 還在
        // （例如 cookie 過期但 localStorage 沒清）讓 AdminFloatingToolbar 之類
        // 仰賴 role 的 UI 誤判
        setProfile(null);
        writeCachedProfile(null);
        setStatus("out");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);
          writeCachedProfile(null);
          setStatus("out");
          return;
        }
        if (session?.user) {
          setUser(session.user);
          setStatus("in");
          loadProfile(session.user.id);
        }
        // 其他 event 帶 null session 不動、避免 INITIAL_SESSION 誤殺
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value: AuthState = useMemo(
    () => ({
      user,
      profile,
      status,
      refreshProfile: async () => {
        if (user) await loadProfile(user.id);
      },
    }),
    [user, profile, status],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) {
    // 不在 provider 內也別炸、回 loading 狀態給 fallback
    return {
      user: null,
      profile: null,
      status: "loading",
      refreshProfile: async () => {},
    };
  }
  return ctx;
}
