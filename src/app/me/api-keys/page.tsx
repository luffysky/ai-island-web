import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { ApiKeysClient } from "./ApiKeysClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "🔑 我的 API Key · AI 島",
  description: "拿 AI 島 API key、在你自己的 app 用雪鑰的能力",
};

export default async function ApiKeysPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/me/api-keys");

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <header className="mb-5">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">🔑 對外 API Keys</h1>
        <p className="text-sm text-fg-muted mt-1">
          拿 AI 島 API key、在你 app 呼叫雪鑰 — 每 key 每月 100 calls free、
          <Link href="/docs/api" className="text-accent hover:underline ml-1">看 API 文件</Link>
        </p>
      </header>
      <ApiKeysClient />
    </div>
  );
}
