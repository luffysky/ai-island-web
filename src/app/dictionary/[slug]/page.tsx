import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getLocale } from "next-intl/server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getCachedTranslations } from "@/lib/content-i18n";
import { ShareButton } from "@/components/share/ShareButton";

export const dynamic = "force-dynamic";

type Term = {
  id: string; slug: string; term: string; zh_name: string | null; category: string; langs: string[];
  plain: string; analogy: string | null; example: string | null; related: string[]; difficulty: number;
};

const CAT_LABEL: Record<string, string> = { syntax: "語法", concept: "概念", slang: "工程師黑話", tool: "工具", error: "常見錯誤" };
const CAT_STYLE: Record<string, string> = {
  syntax: "bg-sky-500/15 text-sky-500", concept: "bg-emerald-500/15 text-emerald-500",
  slang: "bg-fuchsia-500/15 text-fuchsia-500", tool: "bg-amber-500/15 text-amber-500", error: "bg-rose-500/15 text-rose-500",
};
const DIFF = ["", "新手", "一般", "進階"];

async function getTerm(slug: string): Promise<Term | null> {
  const admin = createSupabaseAdmin();
  const { data } = await admin.from("dictionary_terms")
    .select("id, slug, term, zh_name, category, langs, plain, analogy, example, related, difficulty")
    .eq("slug", slug).maybeSingle();
  return (data as Term) ?? null;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://ai-island-web.snowrealm.pet";

function ogImageUrl(t: Pick<Term, "term" | "zh_name" | "category" | "plain" | "langs">): string {
  const q = new URLSearchParams({
    term: t.term,
    zh: t.zh_name ?? "",
    cat: t.category,
    plain: t.plain.slice(0, 90),
    langs: (t.langs ?? []).filter((l) => l !== "general").join(","),
  });
  return `${SITE_URL}/api/og/dict?${q.toString()}`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTerm(slug);
  if (!t) return { title: "找不到這個詞 — AI 島程式辭典" };
  const title = `${t.term}${t.zh_name ? `（${t.zh_name}）` : ""}是什麼？ — AI 島程式辭典`;
  const description = t.plain.slice(0, 150);
  const url = `${SITE_URL}/dictionary/${t.slug}`;
  const ogImg = ogImageUrl(t);
  return {
    title,
    description,
    alternates: { canonical: `/dictionary/${t.slug}` },
    openGraph: { title, description, url, images: [{ url: ogImg, width: 1200, height: 630 }], type: "article", siteName: "AI 島" },
    twitter: { card: "summary_large_image", title, description, images: [ogImg] },
  };
}

export default async function TermPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let t = await getTerm(slug);
  if (!t) notFound();

  // 依語言在地化（中文以外用譯文；沒譯到 fallback 中文）
  const locale = await getLocale();
  if (locale !== "zh") {
    const tr = await getCachedTranslations("dictionary", t.id, locale, { zh_name: t.zh_name ?? "", plain: t.plain, analogy: t.analogy ?? "" });
    t = { ...t, zh_name: tr.zh_name ?? t.zh_name, plain: tr.plain ?? t.plain, analogy: tr.analogy ?? t.analogy };
  }

  // 熱度 +1（fire-and-forget）
  createSupabaseAdmin().rpc("bump_dictionary_view", { p_slug: t.slug }).then(() => {}, () => {});

  // 相關詞（撈得到才顯示）
  const rel = (t.related ?? []).slice(0, 8);
  let related: { slug: string; term: string; zh_name: string | null }[] = [];
  if (rel.length) {
    const { data } = await createSupabaseAdmin().from("dictionary_terms").select("slug, term, zh_name").in("slug", rel);
    related = (data as any[]) ?? [];
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: t.term,
    alternateName: t.zh_name || undefined,
    description: t.plain,
    inDefinedTermSet: { "@type": "DefinedTermSet", name: "AI 島程式辭典" },
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href={"/dictionary" as any} className="inline-flex items-center gap-1 text-sm text-fg-muted hover:text-accent transition mb-4">
        <ArrowLeft size={15} /> 程式辭典
      </Link>

      <article className="space-y-5">
        <header>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAT_STYLE[t.category] ?? "bg-bg-elevated text-fg-muted"}`}>{CAT_LABEL[t.category] ?? t.category}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-bg-elevated text-fg-muted">{DIFF[t.difficulty] ?? "新手"}</span>
            {(t.langs ?? []).filter((l) => l !== "general").map((l) => (
              <span key={l} className="text-xs px-2 py-0.5 rounded-full bg-bg-elevated text-fg-muted">{l}</span>
            ))}
          </div>
          <div className="mt-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-3xl font-extrabold break-all">{t.term}</h1>
              {t.zh_name && <p className="text-lg text-fg-muted mt-0.5">{t.zh_name}</p>}
            </div>
            <ShareButton
              url={`${SITE_URL}/dictionary/${t.slug}`}
              title={`${t.term}${t.zh_name ? `（${t.zh_name}）` : ""} — AI 島程式辭典`}
              text={`${t.term}${t.zh_name ? `（${t.zh_name}）` : ""}是什麼？${t.plain.slice(0, 60)}`}
              label="分享"
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-bg-card text-sm hover:border-accent/50 hover:text-accent transition"
            />
          </div>
        </header>

        <section>
          <div className="text-[15px] leading-relaxed text-fg whitespace-pre-wrap">{t.plain}</div>
        </section>

        {t.analogy && (
          <section className="rounded-2xl border border-border bg-bg-card p-4">
            <div className="text-xs font-bold text-fg-muted mb-1">🔗 生活比喻</div>
            <div className="text-[15px] leading-relaxed whitespace-pre-wrap">{t.analogy}</div>
          </section>
        )}

        {t.example && (
          <section>
            <div className="text-xs font-bold text-fg-muted mb-1.5">💡 小範例</div>
            <pre className="rounded-2xl border border-border bg-bg-card p-4 overflow-x-auto text-sm"><code>{t.example}</code></pre>
          </section>
        )}

        {related.length > 0 && (
          <section>
            <div className="text-xs font-bold text-fg-muted mb-2">🧩 相關詞</div>
            <div className="flex flex-wrap gap-2">
              {related.map((r) => (
                <Link key={r.slug} href={`/dictionary/${r.slug}` as any}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border bg-bg-card text-sm hover:border-accent/50 hover:text-accent transition">
                  {r.term}{r.zh_name ? <span className="text-fg-muted text-xs">{r.zh_name}</span> : null}
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </main>
  );
}
