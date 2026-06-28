"use client";

import { useEffect, useState } from "react";

type Fragment = { id: string; title: string; content: string; tags: string[]; source_type: string };

async function api(url: string, body?: any, method = "POST") {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || json.error || `HTTP ${res.status}`);
  return json;
}

export function CreatorIslandClient({ workspaceId, initialFragments }: { workspaceId: string; initialFragments: Fragment[] }) {
  const [fragments, setFragments] = useState<Fragment[]>(initialFragments);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [nt, setNt] = useState("");
  const [ntags, setNtags] = useState("");
  const [workType, setWorkType] = useState("article");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [dust, setDust] = useState<number | null>(null);
  const [pairs, setPairs] = useState<any[] | null>(null);
  const [related, setRelated] = useState<any[] | null>(null);
  const [recording, setRecording] = useState<{ agent: string; params?: any }[]>([]);
  const [workflows, setWorkflows] = useState<any[] | null>(null);

  useEffect(() => {
    fetch("/api/creator-island/dust").then((r) => r.json()).then((j) => setDust(j.balance ?? 0)).catch(() => {});
  }, []);

  async function openEgg() {
    setErr(null); setBusy("egg");
    try {
      const j = await api("/api/creator-island/eggs/open", { workspaceId });
      setFragments((p) => [j.fragment, ...p]); setDust(j.balance ?? dust);
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }

  // E6 語音輸入（瀏覽器原生 SpeechRecognition）
  function startVoice() {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) { setErr("此瀏覽器不支援語音輸入"); return; }
    const rec = new SR(); rec.lang = "zh-TW"; rec.interimResults = false;
    rec.onresult = (e: any) => setNt((prev) => (prev ? prev + " " : "") + e.results[0][0].transcript);
    rec.onerror = () => setErr("語音輸入失敗");
    rec.start();
  }

  // E6 拍照/上傳圖片 → 碎片
  async function onPhoto(file: File) {
    setErr(null); setBusy("photo");
    try {
      const fd = new FormData(); fd.append("file", file);
      const up = await fetch("/api/upload", { method: "POST", body: fd }).then((r) => r.json());
      if (!up.url) throw new Error(up.message || "上傳失敗");
      const { fragment } = await api("/api/creator-island/fragments", { workspaceId, title: file.name.slice(0, 60) || "圖片碎片", content: `![](${up.url})`, tags: ["圖片"] });
      setFragments((p) => [fragment, ...p]);
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }

  // E8 文化轉譯
  async function transcreateSel() {
    const lang = prompt("轉譯成哪種語言／風格？（例：日系、韓系、English indie、文言文）");
    if (!lang) return;
    const fid = Array.from(selected)[0];
    if (!fid) return;
    setErr(null); setBusy("transcreate");
    try {
      const j = await api("/api/creator-island/ai/transcreate", { workspaceId, fragmentId: fid, targetLanguage: lang, targetCulture: lang });
      setFragments((p) => [j.fragment, ...p]);
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }

  async function explorePairs() {
    setErr(null); setBusy("pairs");
    try { const j = await api("/api/creator-island/fragments/pairs", { workspaceId }); setPairs(j.pairs ?? []); }
    catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }
  async function findRelated(fragmentId: string) {
    setErr(null); setBusy("related");
    try { const j = await fetch(`/api/creator-island/fragments/related?workspaceId=${workspaceId}&fragmentId=${fragmentId}`).then((r) => r.json()); setRelated(j.related ?? []); }
    catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }

  const sel = Array.from(selected);
  const toggle = (id: string) =>
    setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  async function addFragment() {
    if (!nt.trim()) return;
    setErr(null); setBusy("add");
    try {
      const { fragment } = await api("/api/creator-island/fragments", {
        workspaceId, title: nt.trim(),
        tags: ntags.split(/[,，、]/).map((t) => t.trim()).filter(Boolean),
      });
      setFragments((p) => [fragment, ...p]); setNt(""); setNtags("");
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }

  async function run(action: "synthesize" | "evolve" | "compose") {
    setErr(null); setResult(null); setBusy(action);
    try {
      let json: any;
      if (action === "synthesize") json = await api("/api/creator-island/ai/synthesize", { workspaceId, fragmentIds: sel });
      else if (action === "evolve") json = await api("/api/creator-island/ai/evolve", { workspaceId, fragmentId: sel[0], count: 6 });
      else json = await api("/api/creator-island/ai/compose", { workspaceId, fragmentIds: sel, workType });
      setResult({ action, ...json });
      setRecording((p) => [...p, { agent: action, params: action === "evolve" ? { count: 6 } : action === "compose" ? { workType } : {} }]);
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }

  async function saveWorkflow() {
    const title = prompt(`把剛剛這 ${recording.length} 步存成工作流，取個名字：`);
    if (!title) return;
    try { await api("/api/creator-island/workflows", { workspaceId, title, steps: recording }); setRecording([]); alert("✅ 已存成工作流"); }
    catch (e: any) { setErr(e.message); }
  }
  async function loadWorkflows() {
    try { const j = await fetch(`/api/creator-island/workflows?workspaceId=${workspaceId}`).then((r) => r.json()); setWorkflows(j.workflows ?? []); }
    catch (e: any) { setErr(e.message); }
  }
  async function replay(id: string) {
    setErr(null); setBusy("replay");
    try { const j = await api(`/api/creator-island/workflows/${id}/run`, { fragmentIds: Array.from(selected) }); setResult({ action: "replay", results: j.results }); }
    catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }

  async function saveFragment(title: string, content: string) {
    try {
      const { fragment } = await api("/api/creator-island/fragments", { workspaceId, title, content, sourceType: "ai_assisted" });
      setFragments((p) => [fragment, ...p]); setResult(null); setSelected(new Set());
    } catch (e: any) { setErr(e.message); }
  }

  async function saveWork() {
    const r = result?.result;
    if (!r) return;
    setBusy("savework");
    try {
      const body = workType === "song"
        ? { workspaceId, title: r.title, workType, body: r.lyricsSectioned, fragmentIds: sel, sourceType: "ai_assisted", meta: { sunoPrompt: r.sunoPrompt, mvPrompt: r.mvPrompt } }
        : { workspaceId, title: r.title, workType, body: r.body, fragmentIds: sel, sourceType: "ai_assisted" };
      await api("/api/creator-island/works", body);
      setResult(null); setSelected(new Set());
      alert("✅ 已存成作品（之後在作品庫看）");
    } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  }

  const empty = fragments.length === 0;

  return (
    <div className="space-y-5">
      {err && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-2 text-sm flex justify-between">
          <span>⚠️ {err}</span><button onClick={() => setErr(null)}>✕</button>
        </div>
      )}

      {empty && (
        <div className="bg-gradient-to-br from-accent-3/10 to-violet-500/10 border border-accent-3/30 rounded-2xl p-5 text-sm">
          <b>🌱 從一句話開始</b>
          <p className="text-fg-muted mt-1">寫下一句想法 → 勾選它 → 按「演化」生出更多 → 再「編織」成作品。試試看？</p>
        </div>
      )}

      {/* 今日碎片蛋 */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 flex items-center justify-between gap-2 flex-wrap">
        <div className="text-sm">🥚 今日碎片蛋 <span className="text-xs text-fg-muted">— 沒靈感？開一顆換個起點{dust !== null ? `（Dust ${dust}）` : ""}</span></div>
        <button onClick={openEgg} disabled={busy !== null} className="px-3 py-1.5 rounded-full bg-bg-elevated text-sm hover:text-accent disabled:opacity-40">{busy === "egg" ? "開蛋中…" : "開蛋"}</button>
      </div>

      {/* 捕捉 */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-2">
        <div className="font-bold text-sm">✍️ 捕捉碎片</div>
        <input value={nt} onChange={(e) => setNt(e.target.value)} placeholder="一句想法 / 一段回憶 / 一個點子…"
          className="w-full bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent" />
        <div className="flex gap-2">
          <input value={ntags} onChange={(e) => setNtags(e.target.value)} placeholder="標籤（逗號分隔）"
            className="flex-1 bg-bg-elevated border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-accent" />
          <button onClick={startVoice} title="語音輸入" className="px-3 py-2 rounded-full bg-bg-elevated text-sm hover:text-accent">🎤</button>
          <label title="拍照/上傳圖片成碎片" className="px-3 py-2 rounded-full bg-bg-elevated text-sm hover:text-accent cursor-pointer">
            📷<input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(f); e.currentTarget.value = ""; }} />
          </label>
          <button onClick={addFragment} disabled={busy === "add" || !nt.trim()}
            className="px-4 py-2 rounded-full bg-accent text-white text-sm font-bold disabled:opacity-40">＋ 新增</button>
        </div>
      </div>

      {/* 創作工具 */}
      <div className="bg-gradient-to-r from-amber-500/10 to-pink-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-2 flex-wrap">
        <span className="text-xs text-fg-muted mr-auto">已選 <b className="text-fg">{sel.length}</b> 個碎片</span>
        <button onClick={() => run("synthesize")} disabled={busy !== null || sel.length < 2}
          className="px-3 py-1.5 rounded-full bg-bg-elevated text-sm hover:text-accent disabled:opacity-40">🧲 凝聚</button>
        <button onClick={() => run("evolve")} disabled={busy !== null || sel.length !== 1}
          className="px-3 py-1.5 rounded-full bg-bg-elevated text-sm hover:text-accent disabled:opacity-40">🌿 演化</button>
        <button onClick={() => findRelated(sel[0])} disabled={busy !== null || sel.length !== 1}
          className="px-3 py-1.5 rounded-full bg-bg-elevated text-sm hover:text-accent disabled:opacity-40">🔍 找相關</button>
        <button onClick={transcreateSel} disabled={busy !== null || sel.length !== 1}
          className="px-3 py-1.5 rounded-full bg-bg-elevated text-sm hover:text-accent disabled:opacity-40">🌏 轉譯</button>
        <select value={workType} onChange={(e) => setWorkType(e.target.value)} className="bg-bg-elevated border border-border rounded-full px-2 py-1.5 text-xs">
          <option value="article">文章</option><option value="song">歌曲</option><option value="story">故事</option>
        </select>
        <button onClick={() => run("compose")} disabled={busy !== null || sel.length < 1}
          className="px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-pink-500 text-black text-sm font-bold disabled:opacity-40">🧵 編織</button>
      </div>
      {busy && busy !== "add" && (
        <div className="text-sm text-fg-muted">{busy === "synthesize" ? "正在凝聚碎片…" : busy === "evolve" ? "正在演化想法…" : busy === "compose" ? "正在編織作品…" : busy === "pairs" ? "探索意外配對中…" : busy === "related" ? "搜尋相關碎片…" : "處理中…"}</div>
      )}

      {/* E7 工作流（錄製/重播） */}
      <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-sm font-bold">🛠️ 工作流 {recording.length > 0 && <span className="text-xs font-normal text-amber-300">· 錄製中 {recording.length} 步</span>}</div>
          <div className="flex gap-2">
            {recording.length > 0 && <button onClick={saveWorkflow} className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-200">存成工作流</button>}
            <button onClick={loadWorkflows} className="text-xs px-2.5 py-1 rounded-full bg-bg-elevated hover:text-accent">我的工作流</button>
          </div>
        </div>
        {workflows && workflows.length === 0 && <div className="text-xs text-fg-muted">還沒有工作流。做幾個動作後按「存成工作流」，下次一鍵重播。</div>}
        {workflows && workflows.map((w) => (
          <div key={w.id} className="flex items-center justify-between text-xs bg-bg-elevated rounded-lg px-3 py-2">
            <span><b>{w.title}</b> <span className="text-fg-muted">· {(w.steps ?? []).map((s: any) => s.agent).join("→")}</span></span>
            <button onClick={() => replay(w.id)} disabled={busy !== null || selected.size < 1} className="text-accent disabled:opacity-40">▶ 重播</button>
          </div>
        ))}
      </div>

      {/* E5 意外配對 */}
      <div className="bg-bg-card border border-violet-500/30 rounded-2xl p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-bold">🔗 AI 意外配對 <span className="text-xs font-normal text-fg-muted">語意遠、卻可能藏著張力的組合</span></div>
          <button onClick={explorePairs} disabled={busy !== null} className="text-xs px-2.5 py-1 rounded-full bg-violet-500/20 text-violet-200 disabled:opacity-40">探索</button>
        </div>
        {pairs && pairs.length === 0 && <div className="text-xs text-fg-muted">還配不出來（碎片太少或需要更多語意向量）。多寫幾個再探索。</div>}
        {pairs && pairs.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-2">
            {pairs.map((p, i) => (
              <button key={i} onClick={() => { setSelected(new Set([p.a_id, p.b_id])); }}
                className="text-left bg-bg-elevated rounded-lg px-3 py-2 text-xs hover:ring-1 hover:ring-violet-400">
                <b>{p.a_title}</b> <span className="text-violet-300">×</span> <b>{p.b_title}</b>
                <span className="text-fg-muted ml-1">{Math.round(p.similarity * 100)}%</span>
                <div className="text-[10px] text-violet-300 mt-0.5">點一下選這對 → 凝聚/編織</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* E4 主動回憶 */}
      {related && (
        <div className="bg-bg-card border border-border rounded-2xl p-4 space-y-2">
          <div className="text-sm font-bold">🔍 你可能也想到過…</div>
          {related.length === 0 && <div className="text-xs text-fg-muted">沒找到明顯相關的舊碎片。</div>}
          {related.map((r) => (
            <button key={r.id} onClick={() => setSelected((p) => new Set([...p, r.id]))} className="block text-left text-xs text-fg-muted hover:text-accent">
              ＋ {r.title} <span className="opacity-60">{Math.round((r.similarity ?? 0) * 100)}%</span>
            </button>
          ))}
        </div>
      )}

      {/* 結果 */}
      {result && (
        <div className="bg-bg-card border border-accent/40 rounded-2xl p-4 space-y-3">
          {result.action === "synthesize" && (
            <>
              <div className="font-bold">🧲 {result.result.title}</div>
              <p className="text-sm text-fg-muted whitespace-pre-wrap">{result.result.summary}</p>
              <div className="text-xs"><b className="text-accent">核心：</b>{result.result.coreIdea}</div>
              {result.result.connections?.length > 0 && (
                <ul className="text-xs text-fg-muted list-disc list-inside">{result.result.connections.map((c: string, i: number) => <li key={i}>{c}</li>)}</ul>
              )}
              <button onClick={() => saveFragment(result.result.title, `${result.result.coreIdea}\n\n${result.result.summary}`)}
                className="px-3 py-1.5 rounded-full bg-accent text-white text-sm">存成碎片</button>
            </>
          )}
          {result.action === "evolve" && (
            <>
              <div className="font-bold">🌿 演化出 {result.variants.length} 個</div>
              <div className="space-y-2">
                {result.variants.map((v: any, i: number) => (
                  <div key={i} className="bg-bg-elevated rounded-lg p-2 text-sm flex justify-between gap-2">
                    <div><b>{v.title}</b><div className="text-xs text-fg-muted whitespace-pre-wrap">{v.content}</div></div>
                    <button onClick={() => saveFragment(v.title, v.content)} className="shrink-0 text-xs text-accent">＋存</button>
                  </div>
                ))}
              </div>
            </>
          )}
          {result.action === "replay" && (
            <>
              <div className="font-bold">▶ 工作流重播結果</div>
              {result.results?.map((s: any, i: number) => (
                <div key={i} className="text-xs bg-bg-elevated rounded-lg p-2">
                  <b>{s.agent}</b> {s.ok ? "✅" : `❌ ${s.error}`}
                  {s.ok && <div className="text-fg-muted mt-0.5 whitespace-pre-wrap">{s.output?.title ?? s.output?.coreIdea ?? (s.output?.variants ? `${s.output.variants.length} 個變體` : JSON.stringify(s.output).slice(0, 200))}</div>}
                </div>
              ))}
            </>
          )}
          {result.action === "compose" && (
            <>
              <div className="font-bold">🧵 {result.result.title}</div>
              <pre className="text-sm text-fg-muted whitespace-pre-wrap font-sans">{result.result.lyricsSectioned ?? result.result.body}</pre>
              {result.result.sunoPrompt && (
                <div className="text-xs bg-bg-elevated rounded-lg p-2"><b>🎵 Suno：</b>{result.result.sunoPrompt}<br /><b>🎬 MV：</b>{result.result.mvPrompt}</div>
              )}
              <button onClick={saveWork} disabled={busy === "savework"} className="px-3 py-1.5 rounded-full bg-accent text-white text-sm disabled:opacity-40">存成作品</button>
            </>
          )}
        </div>
      )}

      {/* 碎片庫 */}
      <div>
        <div className="text-sm uppercase tracking-wider text-fg-muted mb-2">碎片（{fragments.length}）</div>
        <div className="space-y-2">
          {fragments.map((f) => (
            <label key={f.id} className={`flex items-start gap-2 p-3 rounded-xl border cursor-pointer transition ${selected.has(f.id) ? "border-accent bg-accent/[0.06]" : "border-border bg-bg-card"}`}>
              <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggle(f.id)} className="mt-1" />
              <div className="min-w-0">
                <div className="font-bold text-sm">{f.title}</div>
                {f.content && <div className="text-xs text-fg-muted mt-0.5 line-clamp-2 whitespace-pre-wrap">{f.content}</div>}
                {f.tags?.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{f.tags.map((t) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-fg-muted">#{t}</span>)}</div>}
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
