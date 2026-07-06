"use client";

import { useEffect, useRef, useState } from "react";
import { usePyodide } from "@/hooks/usePyodide";
import type { TurtleLevel } from "@/lib/quest/turtle-levels";
import { TRACE_GUARD, TRACE_OFF, codeLines, starsFor, submitCompletion, shortErr, sfx, parseTag } from "@/lib/quest/engine";
import { QuestShell, QS } from "../../QuestShell";
import { Play, RotateCcw, Loader2, Lightbulb, Sparkles } from "lucide-react";

type Seg = [number, number, number, number];

function buildPython(start: { x: number; y: number; heading: number }, userCode: string): string {
  return `${TRACE_GUARD}import math
_x,_y=${start.x},${start.y}
_h=${start.heading}
_pen=True
_segs=[]
def forward(n):
    global _x,_y
    nx=_x+math.sin(math.radians(_h))*n
    ny=_y-math.cos(math.radians(_h))*n
    if _pen: _segs.append([round(_x,1),round(_y,1),round(nx,1),round(ny,1)])
    _x,_y=nx,ny
    if len(_segs)>500: raise RuntimeError("線太多了")
def right(d):
    global _h; _h=(_h+d)%360
def left(d):
    global _h; _h=(_h-d)%360
def pen_up():
    global _pen; _pen=False
def pen_down():
    global _pen; _pen=True
${userCode}${TRACE_OFF}import json
print("__SEGS__"+json.dumps(_segs))
`;
}

const Q = (v: number) => Math.round(v / 12) * 12;
function edgeKey(s: Seg): string {
  const a = [Q(s[0]), Q(s[1])], b = [Q(s[2]), Q(s[3])];
  const first = a[0] < b[0] || (a[0] === b[0] && a[1] <= b[1]) ? a : b;
  const second = first === a ? b : a;
  return `${first[0]},${first[1]}|${second[0]},${second[1]}`;
}
function edgeSet(segs: Seg[]): Set<string> { return new Set(segs.filter((s) => s[0] !== s[2] || s[1] !== s[3]).map(edgeKey)); }
function setEq(a: Set<string>, b: Set<string>) { return a.size === b.size && [...a].every((k) => b.has(k)); }

export function TurtlePlay({ level, done }: { level: TurtleLevel; done: { stars: number } | null }) {
  const { status, run } = usePyodide(true);
  const [code, setCode] = useState(level.starter);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [stars, setStars] = useState(done?.stars ?? 0);
  const [reward, setReward] = useState<{ xp: number; z: number } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [pixiErr, setPixiErr] = useState(false);

  const mountRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<any>(null);
  const ghostRef = useRef<any>(null);
  const inkRef = useRef<any>(null);
  const animRef = useRef<number | null>(null);
  const targetEdgesRef = useRef<Set<string> | null>(null);

  // Pixi 場景
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const PIXI: any = await import("pixi.js");
        if (dead || !mountRef.current) return;
        const app = new PIXI.Application();
        await app.init({ width: level.canvas.w, height: level.canvas.h, backgroundAlpha: 0, antialias: true });
        if (dead) { app.destroy(true); return; }
        mountRef.current.innerHTML = ""; mountRef.current.appendChild(app.canvas);
        app.canvas.style.maxWidth = "100%"; app.canvas.style.height = "auto"; app.canvas.style.borderRadius = "10px"; app.canvas.style.background = "rgba(13,59,46,0.35)";
        appRef.current = app;
        const ghost = new PIXI.Graphics(); app.stage.addChild(ghost); ghostRef.current = ghost;
        const ink = new PIXI.Graphics(); app.stage.addChild(ink); inkRef.current = ink;
      } catch { setPixiErr(true); }
    })();
    return () => { dead = true; if (animRef.current) clearTimeout(animRef.current); const a = appRef.current; appRef.current = null; if (a) try { a.destroy(true); } catch { /* noop */ } };
  }, [level.canvas.w, level.canvas.h]);

  // 目標：跑一次參考解 → 畫淡輪廓 + 存目標邊集合
  useEffect(() => {
    if (status !== "ready" || targetEdgesRef.current) return;
    (async () => {
      const r = await run(buildPython(level.start, level.solution));
      const segs = parseTag<Seg[]>(r.stdout, "__SEGS__") ?? [];
      targetEdgesRef.current = edgeSet(segs);
      const g = ghostRef.current; if (g) { g.clear(); for (const s of segs) g.moveTo(s[0], s[1]).lineTo(s[2], s[3]); g.stroke({ color: 0x94a3b8, width: 3, alpha: 0.3 }); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const stopAnim = () => { if (animRef.current) { clearTimeout(animRef.current); animRef.current = null; } };
  useEffect(() => () => stopAnim(), []);

  async function runCode() {
    if (running) return;
    if (!targetEdgesRef.current) { setMsg({ type: "err", text: "目標還在載入，稍等一下再執行 🐢" }); return; }
    setMsg(null); setReward(null); setRunning(true); stopAnim();
    inkRef.current?.clear();
    try {
      const r = await run(buildPython(level.start, code));
      if (!r.ok) { setMsg({ type: "err", text: shortErr(r.stderr) }); setRunning(false); return; }
      const segs = parseTag<Seg[]>(r.stdout, "__SEGS__") ?? [];
      const ink = inkRef.current;
      let i = 0;
      const step = () => {
        const s = segs[i];
        if (ink && s) { ink.moveTo(s[0], s[1]).lineTo(s[2], s[3]).stroke({ color: 0x34d399, width: 4 }); sfx("step"); }
        i++;
        if (i < segs.length) animRef.current = window.setTimeout(step, 260); else finish(segs);
      };
      if (segs.length) step(); else finish(segs);
    } catch (e: any) { setMsg({ type: "err", text: e?.message ?? "執行失敗" }); setRunning(false); }
  }

  async function finish(segs: Seg[]) {
    setRunning(false);
    const win = setEq(edgeSet(segs), targetEdgesRef.current!);
    if (!win) { sfx("fail"); setMsg({ type: "err", text: "形狀還不對——對照淡淡的目標輪廓再調整看看 🐢" }); return; }
    sfx("win");
    const s = starsFor(codeLines(code), level.parLines); setStars(s);
    setMsg({ type: "ok", text: `畫對了！⭐ ${s} 星（${codeLines(code)} 行）` });
    const aw = await submitCompletion(level.id, s); if (aw) setReward(aw);
  }

  function resetLevel() { stopAnim(); setMsg(null); setReward(null); inkRef.current?.clear(); }

  return (
    <QuestShell title={level.title} concept={level.concept} chapterHref={level.chapterHref} stars={stars} intro={level.intro}>
      <div className="grid md:grid-cols-2 gap-4">
        <div className={`${QS.panel} p-3 flex items-center justify-center overflow-hidden min-h-[180px]`}>
          <div ref={mountRef} className="w-full flex items-center justify-center" />
          {pixiErr && <div className="text-xs text-slate-400">遊戲畫面載入失敗，重整看看。</div>}
        </div>
        <div className="space-y-2">
          <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} rows={9} className={QS.editor} />
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={runCode} disabled={running || status !== "ready"} className={QS.runBtn}>
              {status !== "ready" ? <><Loader2 size={16} className="animate-spin" /> 載入 Python…</> : running ? <><Loader2 size={16} className="animate-spin" /> 畫圖中</> : <><Play size={16} /> 執行</>}
            </button>
            <button onClick={resetLevel} className={QS.ghostBtn}><RotateCcw size={14} /> 清空</button>
            <button onClick={() => setShowHint((v) => !v)} className={`${QS.ghostBtn} !text-amber-400`}><Lightbulb size={14} /> 提示</button>
          </div>
          {showHint && <div className={QS.hint}><b className="inline-flex items-center gap-1"><Sparkles size={12} /> 綠寶提示</b>{"\n"}{level.hint}{"\n\n"}可用指令：forward(n) / right(度) / left(度) / pen_up() / pen_down()</div>}
          {msg && <div className={`text-sm rounded-xl px-3 py-2 whitespace-pre-wrap ${msg.type === "ok" ? "bg-emerald-500/15 border border-emerald-400/40 text-emerald-200" : "bg-red-500/15 border border-red-400/40 text-red-200"}`}>{msg.text}</div>}
          {reward && <div className="text-sm bg-gradient-to-r from-amber-400/20 to-yellow-400/10 border border-amber-400/40 rounded-xl px-3 py-2 font-bold text-amber-100">🎁 首次通關獎勵：+{reward.xp} XP · +{reward.z} Z 幣</div>}
        </div>
      </div>
    </QuestShell>
  );
}
