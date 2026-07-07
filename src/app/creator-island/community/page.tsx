import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Globe, Mail, Users, ArrowLeft } from "lucide-react";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { listFeed } from "@/lib/creator-engine/social";
import { listActiveStories } from "@/lib/creator-engine/stories";
import { SocialFeed } from "./SocialFeed";
import { Stories } from "./Stories";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  const t = await getTranslations("creator");
  if (!(await isCreatorIslandEnabled())) return <FeatureOffNotice title={`🎨 ${t("communityFeatureOff")}`} />;
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/creator-island/community");
  const [{ items }, stories] = await Promise.all([listFeed({ limit: 15 }), listActiveStories()]);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold inline-flex items-center gap-1.5"><Globe size={20} /> {t("communityTitle")}</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/creator-island/messages" className="text-fg-muted hover:text-accent inline-flex items-center gap-1.5"><Mail size={14} /> {t("communityNavMessages")}</Link>
          <Link href="/creator-island/friends" className="text-fg-muted hover:text-accent inline-flex items-center gap-1.5"><Users size={14} /> {t("communityNavFriends")}</Link>
          <Link href="/creator-island/showcase" className="text-fg-muted hover:text-accent inline-flex items-center gap-1.5"><Globe size={14} /> {t("communityNavShowcase")}</Link>
          <Link href="/creator-island" className="text-accent hover:underline inline-flex items-center gap-1.5"><ArrowLeft size={14} /> {t("communityNavBackToIsland")}</Link>
        </div>
      </header>
      <Stories initial={stories as any} meId={user.id} />
      <SocialFeed initialPosts={items as any} meId={user.id} />
    </div>
  );
}
