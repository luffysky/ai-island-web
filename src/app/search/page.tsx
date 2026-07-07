import Link from "next/link";
import {
  Search as SearchIcon,
  Sparkles,
  BookOpen,
  Swords,
  PenLine,
  MessageCircle,
  FileText,
  MessageSquareText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "搜尋 | AI 島",
  description: "語意搜尋：找章節、副本、部落格、論壇 — 用自然語言問都可以。",
};

const TYPE_META: Record<string, { icon: LucideIcon; text: string; tone: string }> = {
  chapter: { icon: BookOpen, text: "章節", tone: "text-accent" },
  dungeon: { icon: Swords, text: "副本", tone: "text-purple-400" },
  blog: { icon: PenLine, text: "部落格", tone: "text-blue-400" },
  forum_thread: { icon: MessageCircle, text: "論壇", tone: "text-pink-400" },
};

// 分組顯示順序
const GROUP_ORDER = ["chapter", "dungeon", "blog", "forum_thread"];

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet").replace(/\/+$/, "");

type SearchResult = {
  type: string;
  id: string;
  title: string;
  snippet: string;
  url: string;
  similarity: number;
};

async function doSearch(q: string): Promise<SearchResult[]> {
  if (!q || q.length < 2) return [];
  try {
    const res = await fetch(`${SITE_URL}/api/search?q=${encodeURIComponent(q)}&n=15`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const j = await res.json();
    return j.results ?? [];
  } catch {
    return [];
  }
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const t = await getTranslations("search");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const results = await doSearch(q);

  // 依 content_type 分組
  const groups = new Map<string, SearchResult[]>();
  for (const r of results) {
    if (!groups.has(r.type)) groups.set(r.type, []);
    groups.get(r.type)!.push(r);
  }
  const orderedTypes = [
    ...GROUP_ORDER.filter((t) => groups.has(t)),
    ...[...groups.keys()].filter((t) => !GROUP_ORDER.includes(t)),
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <Sparkles size={20} className="text-accent" aria-hidden="true" />
        {t("heading")}
      </h1>
      <p className="text-sm text-fg-muted mb-6">
        {t("intro")}
      </p>

      <form action="/search" method="GET" className="mb-6" role="search">
        <div className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            aria-label={t("inputAriaLabel")}
            placeholder={t("placeholder")}
            className="flex-1 bg-bg-card border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-accent"
            autoFocus
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-accent text-black font-bold rounded-lg inline-flex items-center gap-1"
          >
            <SearchIcon size={14} aria-hidden="true" />
            {t("searchButton")}
          </button>
        </div>
      </form>

      {!q ? (
        <SuggestionBlock />
      ) : results.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title={t("noResultsTitle", { q })}
          desc={t("noResultsDesc")}
        />
      ) : (
        <div className="space-y-8">
          {orderedTypes.map((type) => {
            const meta = TYPE_META[type] ?? { icon: FileText, text: type, tone: "" };
            const Icon = meta.icon;
            const items = groups.get(type)!;
            return (
              <section key={type} aria-label={meta.text}>
                <h2 className={`text-sm font-bold mb-3 flex items-center gap-1.5 ${meta.tone}`}>
                  <Icon size={15} aria-hidden="true" />
                  {meta.text}
                  <span className="text-fg-muted font-normal">({items.length})</span>
                </h2>
                <ul className="space-y-3">
                  {items.map((r) => (
                    <li key={`${r.type}-${r.id}`}>
                      <Link
                        href={r.url.replace(SITE_URL, "") as any}
                        className="block bg-bg-card border border-border hover:border-accent/50 rounded-xl p-4 transition group"
                      >
                        <div className="flex items-center gap-2 mb-1 text-xs">
                          <span className={`font-bold inline-flex items-center gap-1 ${meta.tone}`}>
                            <Icon size={12} aria-hidden="true" />
                            {meta.text}
                          </span>
                          <span className="text-fg-muted">·</span>
                          <span className="text-fg-muted font-mono text-[10px]">
                            {t("similarity", { pct: (r.similarity * 100).toFixed(0) })}
                          </span>
                        </div>
                        <h3 className="font-bold group-hover:text-accent transition">{r.title}</h3>
                        {r.snippet && (
                          <p className="text-sm text-fg-muted mt-1 line-clamp-2">{r.snippet}</p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

async function SuggestionBlock() {
  const t = await getTranslations("search");
  const examples = [
    t("example1"),
    t("example2"),
    t("example3"),
    t("example4"),
    t("example5"),
  ];
  return (
    <div className="space-y-3">
      <p className="text-sm text-fg-muted">{t("suggestPrompt")}</p>
      <div className="grid gap-2">
        {examples.map((ex) => (
          <Link
            key={ex}
            href={`/search?q=${encodeURIComponent(ex)}` as any}
            className="flex items-center gap-2 px-4 py-3 bg-bg-card border border-border hover:border-accent rounded-xl text-sm transition"
          >
            <MessageSquareText size={14} className="text-accent shrink-0" aria-hidden="true" />
            {ex}
          </Link>
        ))}
      </div>
      <p className="text-[11px] text-fg-muted mt-6 leading-relaxed">
        {t.rich("suggestFooterMain", { b: (chunks) => <b>{chunks}</b> })}
        <br />
        {t("suggestFooterImpl")}
      </p>
    </div>
  );
}
