import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { listFeed } from "@/lib/creator-engine/social";
import { SocialFeed } from "./SocialFeed";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  if (!(await isCreatorIslandEnabled())) return <FeatureOffNotice title="🎨 創作者島嶼即將開放" />;
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/creator-island/community");
  const { items } = await listFeed({ limit: 15 });

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">🌐 社群</h1>
        <Link href="/creator-island" className="text-sm text-accent hover:underline">← 回島</Link>
      </header>
      <SocialFeed initialPosts={items as any} meId={user.id} />
    </div>
  );
}
