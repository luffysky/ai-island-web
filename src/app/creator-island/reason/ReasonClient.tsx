"use client";

import Link from "next/link";
import { useState } from "react";
import { Brain, ArrowLeft, Sparkles, Check, X, Loader2, ChevronDown, ChevronRight } from "lucide-react";

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
  const j = await res.json();
  if (!res.ok) throw new Error(j.message || j.error || `HTTP ${res.status}`);
  return j;
}

export function ReasonClient({ workspaceId, fragments }: { workspaceId: string; fragments: Frag[] }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState("adjacent");
  const [intent, setIntent] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [showTrace, setShowTrace] = useState(false);
  const [trace, setTrace] = useState<any[]>([]);
  const [usedMem, setUsedMem] = useState<{ id: string; kind: string; text: string }[]>([]);
  const [verdicts, setVerdicts] = useState<Record<number, string>>({});
  const selArr = Array.from(sel);

  function toggle(id: string) {
    setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
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
        <div className="text-sm font-bold">選 1~數個碎片當線索</div>
        {fragments.length === 0 ? (
          <p className="text-sm text-fg-muted bg-bg-card border border-border rounded-xl p-3">還沒有碎片，先去<Link href="/creator-island" className="text-accent">島上</Link>捕捉幾個。</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {fragments.map((f) => (
              <button key={f.id} onClick={() => toggle(f.id)}
                className={`text-left text-sm rounded-xl border px-3 py-2 transition inline-flex items-center gap-2 ${sel.has(f.id) ? "border-accent bg-accent/10 text-accent" : "border-border bg-bg-card hover:border-accent/40"}`}>
                {sel.has(f.id) && <Check size={14} className="shrink-0" />}<span className="truncate">{f.title}</span>
              </button>
            ))}
          </div>
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
        className="w-full py-3 rounded-full bg-accent text-white font-bold disabled:opacity-40 inline-flex items-center justify-center gap-2">
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
              <div className="flex items-center gap-2 pt-1">
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
