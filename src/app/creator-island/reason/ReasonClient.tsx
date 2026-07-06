"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Brain, ArrowLeft, Sparkles, Check, X, Loader2, ChevronDown, ChevronRight, Search, PenLine, Dices } from "lucide-react";

type Frag = { id: string; title: string };
type Cand = { title: string; body: string; rationale: string; confidence: number; weight: number; evidenceIds: string[]; missing: string[]; rank: number };
type Result = { runId: string; agentRunId: number | null; mode: string; observation: string; candidates: Cand[] };

const MODES = [
  { id: "familiar", label: "熟悉", desc: "貼近你的風格、穩健" },
  { id: "adjacent", label: "相鄰", desc: "帶入相關但沒想到的連結" },
  { id: "exploratory", label: "探索", desc: "刻意跳脫慣性、高新奇" },
];

async function api(url: string, body: any) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  // 伺服器逾時 / gateway 錯誤時回的是 HTML，不是 JSON——直接 res.json() 會爆 "Unexpected token '<'"。先讀文字再解析。
  const raw = await res.text();
  let j: any = null;
  try { j = raw ? JSON.parse(raw) : null; } catch {
    throw new Error(res.status === 504 || res.status === 502 ? "伺服器忙不過來或逾時了，碎片少選幾個、稍後再試一次。" : `伺服器回應異常（HTTP ${res.status}）`);
  }
  if (!res.ok) throw new Error(j?.message || j?.error || `HTTP ${res.status}`);
  return j;
}

export function ReasonClient({ workspaceId, fragments, initialSelected = [] }: { workspaceId: string; fragments: Frag[]; initialSelected?: string[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<Set<string>>(new Set(initialSelected));
  const [mode, setMode] = useState("adjacent");
  const [intent, setIntent] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [showTrace, setShowTrace] = useState(false);
  const [trace, setTrace] = useState<any[]>([]);
  const [usedMem, setUsedMem] = useState<{ id: string; kind: string; text: string }[]>([]);
  const [verdicts, setVerdicts] = useState<Record<number, string>>({});
  const [q, setQ] = useState("");
  const [weaving, setWeaving] = useState<number | null>(null);
  const selArr = Array.from(sel);

  // 331 個碎片全給了 → 搜尋過濾 + 捲動；被選到的永遠留在清單頂端、不會被搜尋濾掉。
  const shownFrags = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const matched = kw ? fragments.filter((f) => f.title.toLowerCase().includes(kw)) : fragments;
    const selSet = sel;
    const picked = fragments.filter((f) => selSet.has(f.id));
    const rest = matched.filter((f) => !selSet.has(f.id));
    return [...picked, ...rest];
  }, [fragments, q, sel]);

  function toggle(id: string) {
    setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  // 🎲 搖一搖：隨機抽 3~4 個碎片當線索（不知道寫什麼時的入口）。
  function shuffle() {
    if (fragments.length === 0) return;
    const n = Math.min(fragments.length, 3 + Math.floor(Math.random() * 2));
    const pool = [...fragments];
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    setSel(new Set(pool.slice(0, n).map((f) => f.id)));
    setQ("");
  }

  // 推理完的後續動作：把某個推理方向直接編織成作品草稿，帶著選到的碎片跳到作品編輯器。
  async function weave(idx: number) {
    if (!result) return;
    const c = result.candidates[idx];
    setWeaving(idx); setErr(null);
    try {
      const { work } = await api("/api/creator-island/works", {
        workspaceId,
        title: c.title,
        body: `${c.body}\n\n---\n（由推理台方向 #${c.rank} 展開：${c.rationale || result.observation}）`,
        fragmentIds: selArr,
        sourceType: "reason",
      });
      router.push(`/creator-island/works/${work.id}`);
    } catch (e: any) { setErr(e.message); setWeaving(null); }
  }

  async function run() {
    if (selArr.length < 1) { setErr("至少選 1 個碎片"); return; }
    setErr(null); setBusy(true); setResult(null); setVerdicts({});
    try {
      const r = await api("/api/creator-island/fie/reason", { workspaceId, seedFragmentIds: selArr, mode, intent: intent.trim() || undefined });
      setResult(r);
      // 取 trace 回放
      const t = await fetch(`/api/creator-island/fie/reason/${r.runId}`).then((x) => x.json()).catch(() => null);
      setTrace(t?.trace ?? []);
      // #92 本次用到的記憶（透明化）
      if (r.agentRunId) {
        const um = await fetch(`/api/creator-island/memory/used?runId=${r.agentRunId}`).then((x) => x.json()).catch(() => null);
        setUsedMem(um?.memories ?? []);
      } else setUsedMem([]);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }

  async function feedback(idx: number, candidateId: string | undefined, verdict: "accepted" | "rejected") {
    if (!result) return;
    // 需要 candidate 的 DB id → 從 trace 或重新取回放；這裡用 runId + rank 對應（後端以 candidateId 為準，先取回放拿 id）
    try {
      const full = await fetch(`/api/creator-island/fie/reason/${result.runId}`).then((x) => x.json());
      const dbCand = (full.candidates ?? []).find((c: any) => c.rank === result.candidates[idx].rank);
      if (!dbCand) throw new Error("找不到 candidate");
      await api(`/api/creator-island/fie/reason/${result.runId}/feedback`, { candidateId: dbCand.id, verdict });
      setVerdicts((v) => ({ ...v, [idx]: verdict }));
    } catch (e: any) { setErr(e.message); }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5">
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold inline-flex items-center gap-2"><Brain size={22} className="text-accent" /> 推理台 <span className="text-xs font-normal text-fg-muted">先理解、再生成（FIE）</span></h1>
        <Link href="/creator-island" className="text-sm text-accent hover:underline inline-flex items-center gap-1.5"><ArrowLeft size={14} /> 回島</Link>
      </header>

      {/* 選碎片 */}
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-sm font-bold">選 1~數個碎片當線索</div>
          <div className="flex items-center gap-2">
            {fragments.length > 0 && (
              <button onClick={shuffle} title="隨機抽幾個碎片" className="text-xs inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-violet-400/40 bg-violet-500/10 text-violet-600 dark:text-violet-300 hover:bg-violet-500/20 transition"><Dices size={13} /> 搖一搖</button>
            )}
            <span className="text-xs text-fg-muted">共 {fragments.length} 個{selArr.length > 0 ? ` · 已選 ${selArr.length}` : ""}</span>
          </div>
        </div>
        {fragments.length === 0 ? (
          <p className="text-sm text-fg-muted bg-bg-card border border-border rounded-xl p-3">還沒有碎片，先去<Link href="/creator-island" className="text-accent">島上</Link>捕捉幾個。</p>
        ) : (
          <>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋碎片…"
                className="w-full text-sm rounded-xl border border-border bg-bg-card pl-9 pr-3 py-2 outline-none focus:border-accent/50" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[46vh] overflow-y-auto pr-1">
              {shownFrags.map((f) => (
                <button key={f.id} onClick={() => toggle(f.id)}
                  className={`text-left text-sm rounded-xl border px-3 py-2 transition inline-flex items-center gap-2 ${sel.has(f.id) ? "border-accent bg-accent/10 text-accent" : "border-border bg-bg-card hover:border-accent/40"}`}>
                  {sel.has(f.id) && <Check size={14} className="shrink-0" />}<span className="truncate">{f.title}</span>
                </button>
              ))}
              {shownFrags.length === 0 && <p className="text-sm text-fg-muted col-span-full px-1 py-2">沒有符合「{q}」的碎片。</p>}
            </div>
          </>
        )}
      </section>

      {/* 模式 + 意圖 */}
      <section className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button key={m.id} onClick={() => setMode(m.id)} title={m.desc}
              className={`px-3 py-1.5 rounded-full border text-sm transition ${mode === m.id ? "border-accent bg-accent/10 text-accent" : "border-border bg-bg-card hover:border-accent/40"}`}>{m.label}</button>
          ))}
          <span className="text-[11px] text-fg-muted self-center">{MODES.find((m) => m.id === mode)?.desc}</span>
        </div>
        <input value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="創作意圖（可選）：想寫成什麼？想突破什麼？"
          className="w-full text-sm rounded-xl border border-border bg-bg-card px-3 py-2 outline-none focus:border-accent/50" />
      </section>

      {err && <div className="bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 rounded-xl px-4 py-2 text-sm">{err}</div>}

      <button onClick={run} disabled={busy || selArr.length < 1}
        className="w-full py-3 rounded-full bg-accent text-black font-bold disabled:opacity-40 inline-flex items-center justify-center gap-2">
        {busy ? <><Loader2 size={18} className="animate-spin" /> 推理中…</> : <><Sparkles size={18} /> 開始推理（{selArr.length} 個碎片）</>}
      </button>

      {/* 結果 */}
      {result && (
        <section className="space-y-3">
          <div className="bg-bg-card border border-border rounded-2xl p-4">
            <div className="text-xs text-fg-muted mb-1">Observation（先建立事實）· 模式：{MODES.find((m) => m.id === result.mode)?.label ?? result.mode}</div>
            <p className="text-sm">{result.observation}</p>
          </div>

          {usedMem.length > 0 && (
            <div className="text-xs text-fg-muted bg-bg-card border border-border rounded-xl px-3 py-2">
              🧠 推理時參考了你的記憶：{usedMem.map((m) => m.text).join("；")}
            </div>
          )}

          <div className="text-sm font-bold">推理出的方向（{result.candidates.length}）· 你決定哪個值得走</div>
          {result.candidates.map((c, i) => (
            <div key={i} className="bg-bg-card border border-border rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="font-bold inline-flex items-center gap-2"><span className="text-xs px-1.5 py-0.5 rounded-full bg-accent/15 text-accent">#{c.rank}</span> {c.title}</div>
                <div className="text-[11px] text-fg-muted">信心 {Math.round(c.confidence * 100)}% · 權重 {c.weight}</div>
              </div>
              <p className="text-sm whitespace-pre-wrap">{c.body}</p>
              {c.rationale && <p className="text-xs text-fg-muted">為何：{c.rationale}</p>}
              {c.missing?.length > 0 && <p className="text-xs text-amber-600 dark:text-amber-400">還缺：{c.missing.join("、")}</p>}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                {/* 推理完的後續動作：直接用這個方向開一篇作品草稿 */}
                <button onClick={() => weave(i)} disabled={weaving !== null}
                  className="text-xs px-3 py-1.5 rounded-full bg-accent text-black font-bold inline-flex items-center gap-1 disabled:opacity-40">
                  {weaving === i ? <Loader2 size={13} className="animate-spin" /> : <PenLine size={13} />} 用這個方向編織成作品
                </button>
                {verdicts[i] ? (
                  <span className={`text-xs font-bold ${verdicts[i] === "accepted" ? "text-emerald-500" : "text-fg-muted"}`}>{verdicts[i] === "accepted" ? "✓ 已採納（記入偏好）" : "已否決"}</span>
                ) : (<>
                  <button onClick={() => feedback(i, undefined, "accepted")} className="text-xs px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1"><Check size={13} /> 採納</button>
                  <button onClick={() => feedback(i, undefined, "rejected")} className="text-xs px-3 py-1.5 rounded-full bg-bg-elevated text-fg-muted border border-border inline-flex items-center gap-1"><X size={13} /> 否決</button>
                </>)}
              </div>
            </div>
          ))}

          {/* Reasoning Trace 回放 */}
          {trace.length > 0 && (
            <div className="bg-bg-card border border-border rounded-2xl p-3">
              <button onClick={() => setShowTrace((s) => !s)} className="text-sm font-bold inline-flex items-center gap-1.5 text-fg-muted">
                {showTrace ? <ChevronDown size={15} /> : <ChevronRight size={15} />} Reasoning Trace（{trace.length} 步）
              </button>
              {showTrace && (
                <ol className="mt-2 space-y-1.5 text-xs">
                  {trace.map((t) => (
                    <li key={t.step_no} className="bg-bg-elevated rounded-lg p-2">
                      <b className="text-accent">{t.step_no}. {t.stage}</b>
                      <pre className="text-fg-muted whitespace-pre-wrap break-all mt-0.5 overflow-x-auto">{JSON.stringify(t.detail).slice(0, 400)}</pre>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
