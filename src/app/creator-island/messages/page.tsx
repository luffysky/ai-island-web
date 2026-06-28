import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { listThreads } from "@/lib/creator-engine/dm";
import { MessagesClient } from "./MessagesClient";

export const dynamic = "force-dynamic";

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  if (!(await isCreatorIslandEnabled())) return <FeatureOffNotice title="🎨 創作者島嶼即將開放" />;
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/creator-island/messages");
  const threads = await listThreads(user.id);
  const { t } = await searchParams;
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">✉️ 訊息</h1>
        <Link href="/creator-island/community" className="text-sm text-accent hover:underline">← 社群</Link>
      </header>
      <MessagesClient initialThreads={threads as any} meId={user.id} initialThreadId={t ?? null} />
    </div>
  );
}
