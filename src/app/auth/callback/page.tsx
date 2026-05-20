import { Suspense } from "react";
import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { CallbackHashHandler } from "./CallbackHashHandler";

export const dynamic = "force-dynamic";

/**
 * Auth Callback - 雙模式
 *
 * 1. PKCE flow: URL 是 ?code=xxx → server 直接處理
 * 2. Implicit flow: URL 是 #access_token=xxx → client component 抓 hash、setSession
 *
 * 不管哪種、最後都到 / (首頁)、已登入
 */
export default async function CallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string; error_description?: string }>;
}) {
  const params = await searchParams;

  // === PKCE flow: server 處理 ===
  if (params.code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);

    if (error) {
      return (
        <div className="max-w-md mx-auto p-8 mt-16 text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-500">登入失敗</h1>
          <p className="text-[var(--color-fg-muted)] mb-4">{error.message}</p>
          <a href="/login" className="text-[var(--color-accent)] underline">重試</a>
        </div>
      );
    }

    // 確保 profile 存在
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userData.user.id)
        .maybeSingle();

      if (!existing) {
        const username = (userData.user.email?.split("@")[0] ?? `user${Date.now()}`).slice(0, 30);
        await supabase.from("profiles").insert({
          id: userData.user.id,
          username,
          display_name: username,
          avatar_url: userData.user.user_metadata?.avatar_url ?? null,
          xp: 0,
          z_coin: 100,
          hearts: 5,
        });
      }
    }

    redirect("/");
  }

  // === Error case ===
  if (params.error) {
    return (
      <div className="max-w-md mx-auto p-8 mt-16 text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-500">登入錯誤</h1>
        <p className="text-[var(--color-fg-muted)] mb-4">{params.error_description || params.error}</p>
        <a href="/login" className="text-[var(--color-accent)] underline">重試</a>
      </div>
    );
  }

  // === Implicit flow: client component 抓 hash ===
  // 沒 code 也沒 error、表示是 implicit flow、hash 在 URL 裡（server 看不到）
  return (
    <div className="max-w-md mx-auto p-8 mt-16 text-center">
      <h1 className="text-2xl font-bold mb-4">登入處理中...</h1>
      <p className="text-[var(--color-fg-muted)] mb-4">請稍候</p>
      <Suspense>
        <CallbackHashHandler />
      </Suspense>
    </div>
  );
}
