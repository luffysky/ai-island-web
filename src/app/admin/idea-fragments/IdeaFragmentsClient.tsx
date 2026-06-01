"use client";

import { useMemo, useState } from "react";
import {
  Sparkles, Plus, Trash2, Pencil, Search, Loader2, Wand2,
  Bookmark, BookmarkCheck, ListTodo, FileText, X, Check,
  List, Clock, Hash, Share2, Rocket,
} from "lucide-react";
import { DailyIdeaCard } from "./DailyIdeaCard";
import { TagCloud } from "./views/TagCloud";
import { Timeline } from "./views/Timeline";
import { RelationshipGraph } from "./views/RelationshipGraph";

type ViewMode = "list" | "timeline" | "tags" | "graph";

type Fragment = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  mood: string | null;
  category: string | null;
  ai_summary: string | null;
  potential_uses: string[];
  created_at: string;
  updated_at: string;
};

type Idea = {
  id: string;
  title: string;
  summary: string;
  idea_type: string | null;
  source_fragment_ids: string[];
  why_it_works: string | null;
  next_steps: string[];
  saved: boolean;
  created_at: string;
};

async function api(url: string, method: string, body?: any) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || json.error || `HTTP ${res.status}`);
  return json;
}

export function IdeaFragmentsClient({
  initialFragments,
  initialIdeas,
  initialDaily,
}: {
  initialFragments: Fragment[];
  initialIdeas: Idea[];
  initialDaily: Idea | null;
}) {
  const [fragments, setFragments] = useState<Fragment[]>(initialFragments);
  const [ideas, setIdeas] = useState<Idea[]>(initialIdeas);
  const [q, setQ] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("list");

  // 新增碎片表單
  const [nt, setNt] = useState("");
  const [nc, setNc] = useState("");
  const [ntags, setNtags] = useState("");
  const [adding, setAdding] = useState(false);

  // 各種 loading state
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState<Fragment | null>(null);
  const [busyIdea, setBusyIdea] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    fragments.forEach((f) => f.tags?.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [fragments]);

  const filtered = useMemo(() => {
    const kw = q.trim().toLowerCase();
    return fragments.filter((f) => {
      if (tagFilter && !f.tags?.includes(tagFilter)) return false;
      if (!kw) return true;
      return (
        f.title.toLowerCase().includes(kw) ||
        (f.content || "").toLowerCase().includes(kw) ||
        (f.ai_summary || "").toLowerCase().includes(kw)
      );
    });
  }, [fragments, q, tagFilter]);

  const fragTitle = (id: string) => fragments.find((f) => f.id === id)?.title ?? "（已刪除碎片）";

  async function addFragment() {
    if (!nt.trim()) return;
    setAdding(true);
    setErr(null);
    try {
      const { fragment } = await api("/api/admin/idea-fragments", "POST", {
        title: nt,
        content: nc,
        tags: ntags.split(/[,，、]/).map((t) => t.trim()).filter(Boolean),
      });
      setFragments((prev) => [fragment, ...prev]);
      setNt(""); setNc(""); setNtags("");
    } catch (e: any) { setErr(e.message); }
    finally { setAdding(false); }
  }

  async function deleteFragment(id: string) {
    if (!confirm("確定刪除這個碎片？")) return;
    try {
      await api(`/api/admin/idea-fragments/${id}`, "DELETE");
      setFragments((prev) => prev.filter((f) => f.id !== id));
    } catch (e: any) { setErr(e.message); }
  }

  async function analyze(id: string) {
    setAnalyzingId(id);
    setErr(null);
    try {
      const { fragment } = await api(`/api/admin/idea-fragments/${id}/analyze`, "POST");
      setFragments((prev) => prev.map((f) => (f.id === id ? fragment : f)));
    } catch (e: any) { setErr(e.message); }
    finally { setAnalyzingId(null); }
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      const { fragment } = await api(`/api/admin/idea-fragments/${editing.id}`, "PATCH", {
        title: editing.title,
        content: editing.content,
        tags: editing.tags,
        mood: editing.mood,
        category: editing.category,
      });
      setFragments((prev) => prev.map((f) => (f.id === fragment.id ? fragment : f)));
      setEditing(null);
    } catch (e: any) { setErr(e.message); }
  }

  async function generate() {
    setGenerating(true);
    setErr(null);
    try {
      const { ideas: fresh } = await api("/api/admin/idea-fragments/generate", "POST", { count: 3 });
      setIdeas((prev) => [...fresh, ...prev]);
    } catch (e: any) { setErr(e.message); }
    finally { setGenerating(false); }
  }

  async function toggleSave(idea: Idea) {
    setBusyIdea(idea.id);
    try {
      const { idea: updated } = await api(`/api/admin/generated-ideas/${idea.id}`, "PATCH", { saved: !idea.saved });
      setIdeas((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch (e: any) { setErr(e.message); }
    finally { setBusyIdea(null); }
  }

  async function deleteIdea(id: string) {
    if (!confirm("丟掉這個點子？")) return;
    try {
      await api(`/api/admin/generated-ideas/${id}`, "DELETE");
      setIdeas((prev) => prev.filter((i) => i.id !== id));
    } catch (e: any) { setErr(e.message); }
  }

  async function convert(id: string, target: "task" | "article" | "product_plan") {
    setBusyIdea(id);
    setErr(null);
    try {
      await api(`/api/admin/generated-ideas/${id}/convert`, "POST", { target });
      alert(
        target === "task" ? "✅ 已轉成任務（到「待辦」看）"
        : target === "article" ? "✅ 已建立文章草稿（到部落格草稿看）"
        : "✅ AI 已展開成產品企劃，存成部落格草稿（標題【產品企劃】…）"
      );
    } catch (e: any) { setErr(e.message); }
    finally { setBusyIdea(null); }
  }

  // 從時間軸 / 關聯圖點碎片 → 開編輯
  function openFragment(id: string) {
    const f = fragments.find((x) => x.id === id);
    if (f) setEditing(f);
  }

  return (
    <div className="space-y-4">
      {err && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-2 text-sm flex items-center justify-between">
          <span>⚠️ {err}</span>
          <button onClick={() => setErr(null)} className="opacity-60 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      {/* ===== 今日點子（每日自動推薦） ===== */}
      <DailyIdeaCard initialDaily={initialDaily} fragmentCount={fragments.length} />

      {/* ===== 主行動：給我一個點子 ===== */}
      <div className="bg-gradient-to-br from-amber-500/10 to-violet-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-fg-muted">
          目前有 <b className="text-fg">{fragments.length}</b> 個碎片。
          {fragments.length < 2 ? " 至少收集 2 個，AI 才能幫你重組點子。" : " 讓 AI 從中找出隱藏的連結。"}
        </div>
        <button
          onClick={generate}
          disabled={generating || fragments.length < 2}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-400 to-pink-500 text-black font-bold shadow-lg hover:scale-[1.02] active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {generating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          {generating ? "AI 重組中…" : "✨ 給我一個點子"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ===== 左：碎片 ===== */}
        <div className="space-y-4">
          {/* 新增碎片 */}
          <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-2">
            <div className="font-bold flex items-center gap-2 text-sm"><Plus size={16} /> 新增碎片</div>
            <input
              value={nt}
              onChange={(e) => setNt(e.target.value)}
              placeholder="標題（一句想法 / 一段回憶 / 一個概念…）"
              className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm focus:border-accent outline-none"
            />
            <textarea
              value={nc}
              onChange={(e) => setNc(e.target.value)}
              placeholder="內容（可留空，之後再補）"
              rows={3}
              className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm focus:border-accent outline-none resize-y"
            />
            <input
              value={ntags}
              onChange={(e) => setNtags(e.target.value)}
              placeholder="標籤，用逗號分隔（青春, 創作, 咖啡）"
              className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm focus:border-accent outline-none"
            />
            <button
              onClick={addFragment}
              disabled={adding || !nt.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-white text-sm font-bold hover:opacity-90 disabled:opacity-40"
            >
              {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} 新增碎片
            </button>
          </div>

          {/* 搜尋 + 標籤篩選 */}
          <div className="bg-bg-card border border-border rounded-2xl p-3 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜尋碎片…"
                className="w-full bg-bg-elevated border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm focus:border-accent outline-none"
              />
            </div>
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tagFilter && (
                  <button onClick={() => setTagFilter(null)} className="text-[11px] px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                    清除篩選 ✕
                  </button>
                )}
                {allTags.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTagFilter(tagFilter === t ? null : t)}
                    className={`text-[11px] px-2 py-0.5 rounded-full transition ${
                      tagFilter === t ? "bg-accent text-white" : "bg-bg-elevated text-fg-muted hover:text-accent"
                    }`}
                  >#{t}</button>
                ))}
              </div>
            )}
          </div>

          {/* 檢視切換 */}
          <div className="flex items-center gap-1 bg-bg-card border border-border rounded-full p-1 text-xs">
            {([
              ["list", "列表", List],
              ["timeline", "時間軸", Clock],
              ["tags", "標籤雲", Hash],
              ["graph", "關聯圖", Share2],
            ] as [ViewMode, string, typeof List][]).map(([v, label, Icon]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-full transition ${
                  view === v ? "bg-accent text-white font-bold" : "text-fg-muted hover:text-accent"
                }`}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          {view === "timeline" && <Timeline fragments={filtered} onSelect={openFragment} />}
          {view === "tags" && (
            <TagCloud
              fragments={fragments}
              activeTag={tagFilter}
              onTagClick={(t) => { setTagFilter(tagFilter === t ? null : t); setView("list"); }}
            />
          )}
          {view === "graph" && <RelationshipGraph fragments={filtered} onSelect={openFragment} />}

          {/* 碎片列表 */}
          {view === "list" && (
          <div className="space-y-2">
            {filtered.length === 0 && (
              <div className="text-center text-fg-muted text-sm py-8">
                {fragments.length === 0 ? "還沒有碎片，從上面開始收集吧 🌱" : "沒有符合的碎片"}
              </div>
            )}
            {filtered.map((f) => (
              <div key={f.id} className="bg-bg-card border border-border rounded-xl p-3 group">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm">{f.title}</div>
                    {f.content && <div className="text-xs text-fg-muted mt-0.5 line-clamp-2 whitespace-pre-wrap">{f.content}</div>}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                    <button onClick={() => setEditing(f)} title="編輯" className="p-1.5 rounded-lg hover:bg-bg-elevated text-fg-muted hover:text-accent"><Pencil size={13} /></button>
                    <button onClick={() => deleteFragment(f.id)} title="刪除" className="p-1.5 rounded-lg hover:bg-bg-elevated text-fg-muted hover:text-red-400"><Trash2 size={13} /></button>
                  </div>
                </div>

                {(f.category || f.mood) && (
                  <div className="flex gap-1.5 mt-1.5 text-[11px]">
                    {f.category && <span className="px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300">{f.category}</span>}
                    {f.mood && <span className="px-1.5 py-0.5 rounded bg-pink-500/15 text-pink-300">{f.mood}</span>}
                  </div>
                )}

                {f.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {f.tags.map((t) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-fg-muted">#{t}</span>)}
                  </div>
                )}

                {f.ai_summary && (
                  <div className="mt-2 text-xs bg-bg-elevated rounded-lg p-2 border-l-2 border-accent">
                    <span className="text-accent font-bold">AI：</span>{f.ai_summary}
                    {f.potential_uses?.length > 0 && (
                      <div className="mt-1 text-fg-muted">可能用途：{f.potential_uses.join("、")}</div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => analyze(f.id)}
                  disabled={analyzingId === f.id}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-bg-elevated hover:bg-accent/20 text-fg-muted hover:text-accent transition disabled:opacity-40"
                >
                  {analyzingId === f.id ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                  {f.ai_summary ? "重新分析" : "分析碎片"}
                </button>
              </div>
            ))}
          </div>
          )}
        </div>

        {/* ===== 右：生成的點子 ===== */}
        <div className="space-y-2">
          <div className="font-bold text-sm flex items-center gap-2 px-1"><Sparkles size={16} className="text-amber-400" /> 點子（{ideas.length}）</div>
          {ideas.length === 0 && (
            <div className="text-center text-fg-muted text-sm py-8 bg-bg-card border border-dashed border-border rounded-xl">
              還沒有點子。收集幾個碎片後，點上面的「✨ 給我一個點子」。
            </div>
          )}
          {ideas.map((idea) => (
            <div
              key={idea.id}
              className={`rounded-xl p-3.5 border ${idea.saved ? "bg-amber-500/[0.07] border-amber-500/40" : "bg-bg-card border-border"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-bold flex items-center gap-2">
                  {idea.title}
                  {idea.idea_type && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-normal">{idea.idea_type}</span>}
                </div>
                <button
                  onClick={() => toggleSave(idea)}
                  disabled={busyIdea === idea.id}
                  title={idea.saved ? "取消儲存" : "儲存這個點子"}
                  className={`p-1.5 rounded-lg shrink-0 ${idea.saved ? "text-amber-400" : "text-fg-muted hover:text-amber-400"} hover:bg-bg-elevated`}
                >
                  {idea.saved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                </button>
              </div>

              {idea.summary && <p className="text-sm text-fg-muted mt-1 whitespace-pre-wrap">{idea.summary}</p>}

              {idea.why_it_works && (
                <div className="mt-2 text-xs">
                  <span className="font-bold text-accent">為什麼成立：</span>
                  <span className="text-fg-muted">{idea.why_it_works}</span>
                </div>
              )}

              {idea.next_steps?.length > 0 && (
                <div className="mt-2 text-xs">
                  <div className="font-bold mb-0.5">下一步：</div>
                  <ul className="list-disc list-inside text-fg-muted space-y-0.5">
                    {idea.next_steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}

              {idea.source_fragment_ids?.length > 0 && (
                <div className="mt-2 text-[11px] text-fg-muted">
                  用到碎片：{idea.source_fragment_ids.map(fragTitle).join("、")}
                </div>
              )}

              <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                <button
                  onClick={() => convert(idea.id, "task")}
                  disabled={busyIdea === idea.id}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-bg-elevated hover:bg-accent/20 text-fg-muted hover:text-accent transition disabled:opacity-40"
                ><ListTodo size={12} /> 轉成任務</button>
                <button
                  onClick={() => convert(idea.id, "article")}
                  disabled={busyIdea === idea.id}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-bg-elevated hover:bg-accent/20 text-fg-muted hover:text-accent transition disabled:opacity-40"
                ><FileText size={12} /> 轉成文章草稿</button>
                <button
                  onClick={() => convert(idea.id, "product_plan")}
                  disabled={busyIdea === idea.id}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-violet-500/15 hover:bg-violet-500/30 text-violet-300 transition disabled:opacity-40"
                >
                  {busyIdea === idea.id ? <Loader2 size={12} className="animate-spin" /> : <Rocket size={12} />} 轉成產品企劃
                </button>
                <button
                  onClick={() => deleteIdea(idea.id)}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-bg-elevated hover:bg-red-500/20 text-fg-muted hover:text-red-400 transition ml-auto"
                ><Trash2 size={12} /> 丟掉</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== 編輯碎片 modal ===== */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditing(null)}>
          <div className="bg-bg-card border border-border rounded-2xl p-4 w-full max-w-lg space-y-2" onClick={(e) => e.stopPropagation()}>
            <div className="font-bold flex items-center gap-2"><Pencil size={16} /> 編輯碎片</div>
            <input
              value={editing.title}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm focus:border-accent outline-none"
            />
            <textarea
              value={editing.content}
              onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              rows={5}
              className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm focus:border-accent outline-none resize-y"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={editing.category ?? ""}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                placeholder="分類"
                className="bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm focus:border-accent outline-none"
              />
              <input
                value={editing.mood ?? ""}
                onChange={(e) => setEditing({ ...editing, mood: e.target.value })}
                placeholder="情緒"
                className="bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm focus:border-accent outline-none"
              />
            </div>
            <input
              value={editing.tags.join(", ")}
              onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(/[,，、]/).map((t) => t.trim()).filter(Boolean) })}
              placeholder="標籤，用逗號分隔"
              className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm focus:border-accent outline-none"
            />
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-full bg-bg-elevated text-sm hover:opacity-80">取消</button>
              <button onClick={saveEdit} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent text-white text-sm font-bold hover:opacity-90"><Check size={14} /> 儲存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
