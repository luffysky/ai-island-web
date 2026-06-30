import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { listFriends, listPending, listSent } from "@/lib/creator-engine/friends";
import { Users } from "lucide-react";
import { FriendsClient } from "./FriendsClient";

export const dynamic = "force-dynamic";

export default async function FriendsPage() {
  if (!(await isCreatorIslandEnabled())) return <FeatureOffNotice title="🎨 創作者島嶼即將開放" />;
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/creator-island/friends");
  const [friends, pending, sent] = await Promise.all([listFriends(user.id), listPending(user.id), listSent(user.id)]);
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold inline-flex items-center gap-2"><Users size={22} /> 好友</h1>
        <Link href="/creator-island/community" className="text-sm text-accent hover:underline">← 社群</Link>
      </header>
      <FriendsClient initialFriends={friends as any} initialPending={pending as any} initialSent={sent as any} />
    </div>
  );
}
