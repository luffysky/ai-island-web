import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getDueReviews } from "@/lib/srs";
import { ReviewClient } from "./ReviewClient";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const t = await getTranslations("mentor");
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const reviews = await getDueReviews(user.id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">{t("reviewTitle")}</h1>
        <p className="text-sm text-fg-muted mt-1">
          {t("reviewSubtitle")}
        </p>
      </header>
      <ReviewClient initialReviews={reviews} />
    </div>
  );
}
