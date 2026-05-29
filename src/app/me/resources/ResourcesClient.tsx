"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, Search, ExternalLink, X, Loader2, BookOpen, Youtube, Newspaper, GraduationCap, Wrench, Users, Mic, FileText, Globe, Gamepad2 } from "lucide-react";

type Resource = {
  id: string;
  title: string;
  short_desc: string;
  long_desc: string | null;
  url: string;
  type: string;
  source: string | null;
  tags: string[];
  topics: string[];
  difficulty: string;
  language: string;
  is_free: boolean;
  curated_by: string;
  image_url: string | null;
};

type Pick = { resource_id: string; reason: string };

const TYPE_META: Record<string, { icon: any; label: string; color: string }> = {
  book:       { icon: BookOpen,        label: "書籍",     color: "bg-orange-500/15 text-orange-700 dark:text-orange-200 border-orange-500/30" },
  youtube:    { icon: Youtube,         label: "YouTube",  color: "bg-red-500/15 text-red-700 dark:text-red-200 border-red-500/30" },
  blog:       { icon: Newspaper,       label: "部落格",   color: "bg-amber-500/15 text-amber-700 dark:text-amber-200 border-amber-500/30" },
  course:     { icon: GraduationCap,   label: "課程",     color: "bg-blue-500/15 text-blue-700 dark:text-blue-200 border-blue-500/30" },
  tool:       { icon: Wrench,          label: "工具",     color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-200 border-emerald-500/30" },
  community:  { icon: Users,           label: "社群",     color: "bg-pink-500/15 text-pink-700 dark:text-pink-200 border-pink-500/30" },
  podcast:    { icon: Mic,             label: "Podcast",  color: "bg-purple-500/15 text-purple-700 dark:text-purple-200 border-purple-500/30" },
  newsletter: { icon: FileText,        label: "電子報",   color: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-200 border-cyan-500/30" },
  docs:       { icon: Globe,           label: "官方文件", color: "bg-slate-500/15 text-slate-700 dark:text-slate-200 border-slate-500/30" },
  playground: { icon: Gamepad2,        label: "練習場",   color: "bg-lime-500/15 text-lime-700 dark:text-lime-200 border-lime-500/30" },
};

const DIFFICULTY_LABEL: Record<string, string> = {
  beginner: "🌱 新手",
  intermediate: "💪 中階",
  advanced: "🔥 進階",
  all: "📚 全程度",
};

const LANGUAGE_LABEL: Record<string, string> = {
  zh: "🇹🇼 中文",
  en: "🇬🇧 英文",
  jp: "🇯🇵 日文",
};

export function ResourcesClient() {
  const [tab, setTab] = useState<"recommend" | "browse">("recommend");
  const [resources, setResources] = useState<Resource[]>([]);
  const [picks, setPicks] = useState<Pick[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("");
  const [filterLanguage, setFilterLanguage] = useState("");
  const [opened, setOpened] = useState<Resource | null>(null);

  useEffect(() => {
    loadRecommendations();
    loadAll();
  }, []);

  async function loadRecommendations() {
    setAiLoading(true);
    try {
      const res = await fetch("/api/me/resources/recommend", { method: "POST", credentials: "include" });
      const j = await res.json();
      if (j.ok) setPicks(j.picks ?? []);
    } finally {
      setAiLoading(false);
    }
  }

  async function loadAll() {
    setBrowseLoading(true);
    try {
      const res = await fetch("/api/me/resources?limit=100", { credentials: "include" });
      const j = await res.json();
      setResources(j.resources ?? []);
    } finally {
      setBrowseLoading(false);
    }
  }

  const resMap = useMemo(() => {
    const m = new Map<string, Resource>();
    for (const r of resources) m.set(r.id, r);
    return m;
  }, [resources]);

  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      if (filterType && r.type !== filterType) return false;
      if (filterDifficulty && r.difficulty !== filterDifficulty) return false;
      if (filterLanguage && r.language !== filterLanguage) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!r.title.toLowerCase().includes(q) && !r.short_desc.toLowerCase().includes(q) && !r.tags.some((t) => t.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [resources, filterType, filterDifficulty, filterLanguage, search]);

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-border mb-4">
        <button
          onClick={() => setTab("recommend")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${tab === "recommend" ? "border-accent text-accent" : "border-transparent text-fg-muted hover:text-fg"}`}
        >
          <Sparkles size={14} className="inline mr-1" /> 雪鑰推薦
        </button>
        <button
          onClick={() => setTab("browse")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${tab === "browse" ? "border-accent text-accent" : "border-transparent text-fg-muted hover:text-fg"}`}
        >
          <Search size={14} className="inline mr-1" /> 全部搜尋
        </button>
      </div>

      {tab === "recommend" && (
        <RecommendTab loading={aiLoading} picks={picks} resMap={resMap} onOpen={setOpened} onRefresh={loadRecommendations} />
      )}

      {tab === "browse" && (
        <BrowseTab
          loading={browseLoading}
          resources={filteredResources}
          search={search} setSearch={setSearch}
          filterType={filterType} setFilterType={setFilterType}
          filterDifficulty={filterDifficulty} setFilterDifficulty={setFilterDifficulty}
          filterLanguage={filterLanguage} setFilterLanguage={setFilterLanguage}
          totalCount={resources.length}
          onOpen={setOpened}
        />
      )}

      {opened && <DetailModal r={opened} onClose={() => setOpened(null)} />}
    </div>
  );
}

function RecommendTab({ loading, picks, resMap, onOpen, onRefresh }: {
  loading: boolean; picks: Pick[] | null;
  resMap: Map<string, Resource>; onOpen: (r: Resource) => void; onRefresh: () => void;
}) {
  if (loading) {
    return (
      <div className="py-16 text-center text-fg-muted">
        <Loader2 size={24} className="animate-spin mx-auto mb-3" />
        雪鑰看你的學習狀況、挑選中...
      </div>
    );
  }
  if (!picks || picks.length === 0) {
    return (
      <div className="py-16 text-center text-fg-muted">
        <p>沒有推薦、雪鑰可能還在學習你的偏好</p>
        <button onClick={onRefresh} className="btn-chip btn-chip-info mt-4">重新推薦</button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-fg-muted mb-3 italic">
        ✨ 雪鑰根據你最近學的章節 + 風格偏好挑了這 {picks.length} 個資源
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {picks.map((p) => {
          const r = resMap.get(p.resource_id);
          if (!r) return null;
          return <ResourceCard key={p.resource_id} r={r} reason={p.reason} onOpen={() => onOpen(r)} />;
        })}
      </div>
      <div className="text-center mt-6">
        <button onClick={onRefresh} className="btn-chip btn-chip-info">
          <Sparkles size={14} /> 重新推薦
        </button>
      </div>
    </div>
  );
}

function BrowseTab({ loading, resources, search, setSearch, filterType, setFilterType, filterDifficulty, setFilterDifficulty, filterLanguage, setFilterLanguage, totalCount, onOpen }: any) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4 bg-bg-card border border-border rounded-xl p-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search size={16} className="text-fg-muted" />
          <input
            value={search}
            onChange={(e: any) => setSearch(e.target.value)}
            placeholder="搜尋資源（標題 / 描述 / 標籤）..."
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
        <select value={filterType} onChange={(e: any) => setFilterType(e.target.value)} className="bg-bg-elevated border border-border rounded px-3 py-1.5 text-sm">
          <option value="">全部類型</option>
          {Object.entries(TYPE_META).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select value={filterDifficulty} onChange={(e: any) => setFilterDifficulty(e.target.value)} className="bg-bg-elevated border border-border rounded px-3 py-1.5 text-sm">
          <option value="">全部難度</option>
          <option value="beginner">🌱 新手</option>
          <option value="intermediate">💪 中階</option>
          <option value="advanced">🔥 進階</option>
        </select>
        <select value={filterLanguage} onChange={(e: any) => setFilterLanguage(e.target.value)} className="bg-bg-elevated border border-border rounded px-3 py-1.5 text-sm">
          <option value="">全部語言</option>
          <option value="zh">🇹🇼 中文</option>
          <option value="en">🇬🇧 英文</option>
        </select>
        <span className="text-xs text-fg-muted">{resources.length} / {totalCount} 條</span>
      </div>

      {loading ? (
        <div className="py-16 text-center text-fg-muted"><Loader2 size={20} className="animate-spin mx-auto" /></div>
      ) : resources.length === 0 ? (
        <div className="py-16 text-center text-fg-muted">沒符合條件的資源、換個關鍵字試試</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((r: Resource) => (
            <ResourceCard key={r.id} r={r} onOpen={() => onOpen(r)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ResourceCard({ r, reason, onOpen }: { r: Resource; reason?: string; onOpen: () => void }) {
  const meta = TYPE_META[r.type] ?? TYPE_META.docs;
  const Icon = meta.icon;
  return (
    <div
      onClick={onOpen}
      className="bg-bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-accent transition hover:shadow-lg flex flex-col"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded border ${meta.color}`}>
          <Icon size={11} /> {meta.label}
        </span>
        {r.curated_by === "xueyue" && (
          <span className="chip chip-info text-[10px]">✨ 雪鑰精選</span>
        )}
      </div>
      <h3 className="font-bold mb-1 leading-snug">{r.title}</h3>
      {r.source && <p className="text-[11px] text-fg-muted mb-2">📍 {r.source}</p>}
      <p className="text-sm text-fg-muted line-clamp-2 flex-1">{r.short_desc}</p>
      {reason && (
        <p className="text-xs text-accent-2 mt-2 italic border-l-2 border-accent-2 pl-2">
          💬 {reason}
        </p>
      )}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border text-[10px] text-fg-muted">
        <span>{DIFFICULTY_LABEL[r.difficulty] ?? r.difficulty}</span>
        <span>{LANGUAGE_LABEL[r.language] ?? r.language}</span>
        {!r.is_free && <span className="chip chip-warn text-[10px]">💰 付費</span>}
      </div>
    </div>
  );
}

function DetailModal({ r, onClose }: { r: Resource; onClose: () => void }) {
  const meta = TYPE_META[r.type] ?? TYPE_META.docs;
  const Icon = meta.icon;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-3" onClick={onClose}>
      <div className="bg-bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-border px-5 py-4 flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded border ${meta.color}`}>
                <Icon size={11} /> {meta.label}
              </span>
              {r.curated_by === "xueyue" && (
                <span className="chip chip-info text-[10px]">✨ 雪鑰精選</span>
              )}
            </div>
            <h2 className="text-xl font-bold">{r.title}</h2>
            {r.source && <p className="text-xs text-fg-muted mt-1">📍 {r.source}</p>}
          </div>
          <button onClick={onClose} className="text-fg-muted hover:text-fg p-1"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <p className="text-sm">{r.short_desc}</p>
          </div>
          {r.long_desc && (
            <div className="bg-bg-elevated border-l-2 border-accent-2 pl-3 py-2 rounded">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{r.long_desc}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {r.tags?.map((t) => (
              <span key={t} className="chip chip-neutral text-[10px]">#{t}</span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-fg-muted pt-2 border-t border-border">
            <span>{DIFFICULTY_LABEL[r.difficulty] ?? r.difficulty}</span>
            <span>·</span>
            <span>{LANGUAGE_LABEL[r.language] ?? r.language}</span>
            {!r.is_free && <><span>·</span><span className="text-amber-700 dark:text-amber-300">💰 需付費</span></>}
          </div>
        </div>

        <div className="border-t border-border p-4">
          <a
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-chip btn-chip-success w-full justify-center text-sm py-3"
          >
            <ExternalLink size={14} /> 前往 — 開新分頁
          </a>
        </div>
      </div>
    </div>
  );
}
