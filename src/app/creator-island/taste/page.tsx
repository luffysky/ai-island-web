import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Heart } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { TasteLibrary } from "./TasteLibrary";

export const dynamic = "force-dynamic";

export default async function TastePage() {
  const t = await getTranslations("creator");
  if (!(await isCreatorIslandEnabled())) return <FeatureOffNotice title={`🎨 ${t("featureOffTitle")}`} />;
  const sb = await createSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login?next=/creator-island/taste");

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <Link href="/creator-island" className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-accent mb-6">
        <ArrowLeft size={14} /> 回創作者島嶼
      </Link>
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black inline-flex items-center gap-2">
          <Heart size={26} className="text-pink-400 fill-current" /> 我的品味庫
        </h1>
        <p className="text-sm text-fg-muted mt-1.5">餵給 AI 你喜歡的東西，讓它越來越懂你的創作口味。</p>
      </header>
      <TasteLibrary />
    </div>
  );
}
