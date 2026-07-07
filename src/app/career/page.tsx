import { CareerPathSection } from "@/components/home/CareerPathSection";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Target } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("career");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "/career" },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      type: "website",
    },
  };
}

export default async function CareerIndexPage() {
  const t = await getTranslations("career");
  return (
    <div>
      <div className="max-w-6xl mx-auto px-6 py-12 text-center">
        <h1 className="text-3xl font-bold mb-2 inline-flex w-full items-center justify-center gap-2"><Target size={28} className="text-accent" /> {t("pageTitle")}</h1>
        <p className="text-fg-muted">{t("pageSubtitle")}</p>
      </div>
      <CareerPathSection />
    </div>
  );
}
