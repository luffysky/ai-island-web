import type { Metadata } from "next";
import Link from "next/link";
import { Award, BadgeCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { ShareButton } from "@/components/share/ShareButton";
import { CertActions } from "./CertActions";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ai-island-web.snowrealm.pet";

type Cert = {
  title: string;
  cert_key: string;
  issued_at: string | null;
  verification_code: string | null;
  learner: string;
};

async function getCert(code: string): Promise<Cert | null> {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("certificates")
    .select("title, cert_key, issued_at, verification_code, user_id")
    .eq("verification_code", code)
    .maybeSingle();
  if (!data) return null;
  const { data: prof } = await admin
    .from("profiles")
    .select("display_name, username")
    .eq("id", (data as any).user_id)
    .maybeSingle();
  const learner = (prof as any)?.display_name || (prof as any)?.username || "AI 島民";
  return { ...(data as any), learner };
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const cert = await getCert(code);
  if (!cert) return { title: "證書查無 · AI 島", robots: { index: false } };
  const title = `${cert.learner} 的完課證書：${cert.title}`;
  const desc = `${cert.learner} 在 AI 島完成了「${cert.title}」，來看看這張完課證書！`;
  const ogImg = `${SITE_URL}/api/og/cert?title=${encodeURIComponent(cert.title)}&name=${encodeURIComponent(cert.learner)}&code=${encodeURIComponent(cert.verification_code || "")}`;
  return {
    title,
    description: desc,
    alternates: { canonical: `/certificates/${code}` },
    openGraph: { title, description: desc, images: [{ url: ogImg, width: 1200, height: 630 }], type: "article", siteName: "AI 島", url: `${SITE_URL}/certificates/${code}` },
    twitter: { card: "summary_large_image", title, description: desc, images: [ogImg] },
  };
}

export default async function CertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const cert = await getCert(code);
  const t = await getTranslations("certificates");

  if (!cert) {
    return (
      <main className="max-w-lg mx-auto px-4 py-24 text-center space-y-4">
        <div className="text-5xl">🔎</div>
        <h1 className="text-xl font-bold">{t("notFoundTitle")}</h1>
        <p className="text-sm text-fg-muted">{t("notFoundDesc")}</p>
        <Link href="/chapters" className="inline-block px-5 py-2.5 rounded-full bg-accent text-black font-semibold">{t("startLearning")}</Link>
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto px-4 py-12 space-y-6">
      {/* 證書卡 */}
      <div id="cert-card" className="relative rounded-3xl border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-500/15 via-orange-500/10 to-bg-card p-8 text-center overflow-hidden">
        <div className="absolute -top-24 -right-16 w-64 h-64 rounded-full bg-yellow-400/10 blur-3xl" />
        <div className="relative">
          <Award size={56} className="text-yellow-400 mx-auto mb-3" />
          <div className="text-xs tracking-[0.3em] text-yellow-500/80 font-semibold">CERTIFICATE OF COMPLETION</div>
          <div className="mt-4 text-sm text-fg-muted">{t("issuedTo")}</div>
          <div className="mt-1 text-2xl font-bold">{cert.learner}</div>
          <h1 className="mt-4 text-3xl font-black text-yellow-400 leading-tight">{cert.title}</h1>
          {cert.issued_at && (
            <div className="mt-4 text-xs text-fg-muted">
              {t("issuedOn", { date: new Date(cert.issued_at).toLocaleDateString("zh-TW") })}
            </div>
          )}
          {cert.verification_code && (
            <div className="mt-1 text-xs font-mono text-fg-muted">{t("verificationCode", { code: cert.verification_code })}</div>
          )}
          <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
            <BadgeCheck size={14} /> {t("verifiedBadge")}
          </div>
        </div>
      </div>

      <div className="cert-no-print flex flex-wrap items-center justify-center gap-3">
        <ShareButton
          url={`${SITE_URL}/certificates/${code}`}
          title={t("shareTitle", { name: cert.learner, title: cert.title })}
          text={t("shareText", { title: cert.title })}
          label={t("shareLabel")}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-semibold hover:opacity-90 transition"
        />
        <CertActions
          ogImageUrl={`${SITE_URL}/api/og/cert?title=${encodeURIComponent(cert.title)}&name=${encodeURIComponent(cert.learner)}&code=${encodeURIComponent(cert.verification_code || "")}`}
          fileBase={`AI島完課證書-${cert.title}`}
        />
        <Link href="/chapters" className="px-5 py-2.5 rounded-full border border-border hover:bg-bg-elevated transition">{t("goLearn")}</Link>
      </div>
    </main>
  );
}
