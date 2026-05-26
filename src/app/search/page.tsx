import Link from "next/link";
import { Search as SearchIcon, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "搜尋 | AI 島",
  description: "語意搜尋：找章節、副本、部落格、論壇 — 用自然語言問都可以。",
};

const TYPE_LABEL: Record<string, { emoji: string; text: string; tone: string }> = {
  chapter: { emoji: "📚", text: "章節", tone: "text-accent" },
  dungeon: { emoji: "⚔️", text: "副本", tone: "text-purple-400" },
  blog: { emoji: "📝", text: "部落格", tone: "text-blue-400" },
  forum_thread: { emoji: "💭", text: "論壇", tone: "text-pink-400" },
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";

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
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const results = await doSearch(q);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <Sparkles size={20} className="text-accent" />
        語意搜尋
      </h1>
      <p className="text-sm text-fg-muted mb-6">
        用自然語言問問題、AI 幫你找跨章節 / 副本 / 部落格 / 論壇的最相關內容。
      </p>

      <form action="/search" method="GET" className="mb-6">
        <div className="flex gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="例如：怎麼從 0 開始學 React Hook、AI Agent 是什麼、台灣 SEO 要怎麼做..."
            className="flex-1 bg-bg-card border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-accent"
            autoFocus
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-accent text-black font-bold rounded-lg inline-flex items-center gap-1"
          >
            <SearchIcon size={14} />
            搜尋
          </button>
        </div>
      </form>

      {!q ? (
        <SuggestionBlock />
      ) : results.length === 0 ? (
        <EmptyState
          emoji="🔍"
          title={`沒找到「${q}」相關內容`}
          desc="試試不同關鍵字、或用更具體 / 更簡短的問題。"
        />
      ) : (
        <ul className="space-y-3">
          {results.map((r) => {
            const tag = TYPE_LABEL[r.type] ?? { emoji: "📄", text: r.type, tone: "" };
            return (
              <li key={`${r.type}-${r.id}`}>
                <Link
                  href={r.url.replace(SITE_URL, "") as any}
                  className="block bg-bg-card border border-border hover:border-accent/50 rounded-xl p-4 transition group"
                >
                  <div className="flex items-center gap-2 mb-1 text-xs">
                    <span className={`font-bold ${tag.tone}`}>
                      {tag.emoji} {tag.text}
                    </span>
                    <span className="text-fg-muted">·</span>
                    <span className="text-fg-muted font-mono text-[10px]">
                      相似度 {(r.similarity * 100).toFixed(0)}%
                    </span>
                  </div>
                  <h3 className="font-bold group-hover:text-accent transition">{r.title}</h3>
                  {r.snippet && (
                    <p className="text-sm text-fg-muted mt-1 line-clamp-2">{r.snippet}</p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SuggestionBlock() {
  const examples = [
    "怎麼從 0 開始學 React Hooks？",
    "Next.js 跟 Nuxt 哪個適合台灣 SEO？",
    "AI Agent 是什麼、怎麼自己寫一個",
    "TypeScript generics 有什麼用",
    "想接案、要先學什麼",
  ];
  return (
    <div className="space-y-3">
      <p className="text-sm text-fg-muted">試試這些問題：</p>
      <div className="grid gap-2">
        {examples.map((q) => (
          <Link
            key={q}
            href={`/search?q=${encodeURIComponent(q)}` as any}
            className="block px-4 py-3 bg-bg-card border border-border hover:border-accent rounded-xl text-sm transition"
          >
            💬 {q}
          </Link>
        ))}
      </div>
      <p className="text-[11px] text-fg-muted mt-6 leading-relaxed">
        💡 <b>語意搜尋</b> 比一般關鍵字強：可以問問題（「怎麼...」「為什麼...」）、可以用同義詞、可以跨章節找答案。
        <br />
        實作：OpenAI text-embedding-3-small + pgvector cosine similarity、跨類型 ranking。
      </p>
    </div>
  );
}
