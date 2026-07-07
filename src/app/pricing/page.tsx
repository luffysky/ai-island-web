import { getTranslations } from "next-intl/server";
import { PricingClient } from "./PricingClient";
import { SITE_STATS } from "@/lib/site-stats";

const CH = SITE_STATS.chapterCount;

export async function generateMetadata() {
  const t = await getTranslations("store");
  return {
    title: t("pricingMetaTitle"),
    description: t("pricingMetaDesc", { ch: CH, lessons: SITE_STATS.lessonCount }),
  };
}

export default function PricingPage() {
  return <PricingClient />;
}
