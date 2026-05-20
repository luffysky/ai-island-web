import { createSupabaseServer } from "@/lib/supabase-server";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DebugAuthPage() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();

  let user: any = null;
  let userError: string | null = null;
  let session: any = null;
  let sessionError: string | null = null;
  let profile: any = null;
  let profileError: string | null = null;

  try {
    const supabase = await createSupabaseServer();

    const { data: userData, error: uErr } = await supabase.auth.getUser();
    user = userData.user;
    userError = uErr?.message ?? null;

    const { data: sessionData, error: sErr } = await supabase.auth.getSession();
    session = sessionData.session;
    sessionError = sErr?.message ?? null;

    if (user) {
      const { data: profileData, error: pErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      profile = profileData;
      profileError = pErr?.message ?? null;
    }
  } catch (e: any) {
    userError = `EXCEPTION: ${e.message}`;
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Auth Debug</h1>

      <section className="mb-8 p-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)]">
        <h2 className="text-xl font-bold mb-3">
          {user ? "✅ 已登入" : "❌ 未登入"}
        </h2>
        {user && (
          <pre className="text-xs overflow-auto bg-black p-3 rounded">
            {JSON.stringify({ id: user.id, email: user.email, created_at: user.created_at }, null, 2)}
          </pre>
        )}
        {userError && (
          <div className="text-red-500">
            <strong>getUser error:</strong> {userError}
          </div>
        )}
      </section>

      <section className="mb-8 p-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)]">
        <h2 className="text-xl font-bold mb-3">Session</h2>
        <div>有 session: {session ? "✅" : "❌"}</div>
        {sessionError && <div className="text-red-500">Error: {sessionError}</div>}
        {session && (
          <pre className="text-xs overflow-auto bg-black p-3 rounded mt-2">
            {JSON.stringify({
              expires_at: session.expires_at,
              expires_in_seconds: session.expires_at ? session.expires_at - Math.floor(Date.now() / 1000) : null,
              user_email: session.user?.email,
              provider: session.user?.app_metadata?.provider,
            }, null, 2)}
          </pre>
        )}
      </section>

      <section className="mb-8 p-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)]">
        <h2 className="text-xl font-bold mb-3">Profile</h2>
        <div>有 profile 紀錄: {profile ? "✅" : "❌"}</div>
        {profileError && <div className="text-red-500">Error: {profileError}</div>}
        {profile && (
          <pre className="text-xs overflow-auto bg-black p-3 rounded mt-2">
            {JSON.stringify(profile, null, 2)}
          </pre>
        )}
      </section>

      <section className="mb-8 p-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)]">
        <h2 className="text-xl font-bold mb-3">Cookies（{allCookies.length} 個）</h2>
        <pre className="text-xs overflow-auto bg-black p-3 rounded">
          {JSON.stringify(
            allCookies.map((c) => ({
              name: c.name,
              size: c.value?.length ?? 0,
              first_chars: c.value?.slice(0, 30),
            })),
            null,
            2
          )}
        </pre>
        <div className="mt-3 text-sm text-[var(--color-fg-muted)]">
          🎯 預期看到：<code className="bg-black px-2 py-1 rounded">sb-XXX-auth-token</code> 開頭的 cookie
        </div>
      </section>

      <section className="p-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)]">
        <h2 className="text-xl font-bold mb-3">環境變數</h2>
        <pre className="text-xs overflow-auto bg-black p-3 rounded">
          {JSON.stringify({
            NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
            has_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          }, null, 2)}
        </pre>
      </section>

      <div className="mt-6 text-sm text-[var(--color-fg-muted)]">
        重新整理這頁、即時看狀態。如果這頁說「已登入」、表示 server 端 OK、是 client/middleware 哪邊把它弄丟了。
      </div>
    </div>
  );
}
