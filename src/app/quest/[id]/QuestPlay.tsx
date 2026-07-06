"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePyodide } from "@/hooks/usePyodide";
import type { QuestLevel } from "@/lib/quest/levels";
import { ArrowLeft, Play, RotateCcw, Loader2, Lightbulb, Sparkles } from "lucide-react";

type Cell = 0 | 1;
type Parsed = { cells: Cell[][]; W: number; H: number; start: { x: number; y: number }; goal: { x: number; y: number }; gems: { x: number; y: number }[] };

function parseGrid(grid: string[]): Parsed {
  const H = grid.length, W = Math.max(...grid.map((r) => r.length));
  const cells: Cell[][] = [], gems: { x: number; y: number }[] = [];
  let start = { x: 0, y: 0 }, goal = { x: 0, y: 0 };
  for (let y = 0; y < H; y++) {
    const row: Cell[] = [];
    for (let x = 0; x < W; x++) {
      const ch = grid[y][x] ?? ".";
      row.push(ch === "#" ? 1 : 0);
      if (ch === "S") start = { x, y };
      else if (ch === "G") goal = { x, y };
      else if (ch === "*") gems.push({ x, y });
    }
    cells.push(row);
  }
  return { cells, W, H, start, goal, gems };
}

function buildPython(p: Parsed, startDir: number, userCode: string): string {
  const gemsPy = JSON.stringify(p.gems.map((g) => [g.x, g.y]));
  return `import sys
_ops=[0]
def _trace(f,e,a):
    _ops[0]+=1
    if _ops[0]>400000: raise RuntimeError("執行太久了（是不是無限迴圈？）")
    return _trace
sys.settrace(_trace)
_grid=${JSON.stringify(p.cells)}
_gx,_gy=${p.goal.x},${p.goal.y}
_gems=${gemsPy}
rx,ry,rdir=${p.start.x},${p.start.y},${startDir}
_W,_H=${p.W},${p.H}
_DX=[0,1,0,-1]; _DY=[-1,0,1,0]
_collected=set()
_trail=[{"x":rx,"y":ry,"dir":rdir,"g":0,"blocked":False}]
def _cell(x,y):
    if x<0 or y<0 or x>=_W or y>=_H: return 1
    return _grid[y][x]
def _rec(blocked=False):
    _trail.append({"x":rx,"y":ry,"dir":rdir,"g":len(_collected),"blocked":blocked})
    if len(_trail)>800: raise RuntimeError("步數太多了")
def move():
    global rx,ry
    nx,ny=rx+_DX[rdir],ry+_DY[rdir]
    if _cell(nx,ny)==1:
        _rec(True); return
    rx,ry=nx,ny
    if [rx,ry] in _gems: _collected.add((rx,ry))
    _rec()
def turn_left():
    global rdir; rdir=(rdir-1)%4; _rec()
def turn_right():
    global rdir; rdir=(rdir+1)%4; _rec()
def wall_ahead():
    return _cell(rx+_DX[rdir],ry+_DY[rdir])==1
def at_goal():
    return rx==_gx and ry==_gy
${userCode}
sys.settrace(None)
import json
print("__TRAIL__"+json.dumps(_trail))
print("__WIN__"+json.dumps({"win": (rx==_gx and ry==_gy) and len(_collected)==len(_gems), "gems": len(_collected), "total": len(_gems)}))
`;
}

function codeLines(code: string) {
  return code.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).length;
}

const CELL = 46;

export function QuestPlay({ level, done }: { level: QuestLevel; done: { stars: number } | null }) {
  const parsed = useMemo(() => parseGrid(level.grid), [level.grid]);
  const { status, load, run } = usePyodide(true);
  const [code, setCode] = useState(level.starter);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err" | "info"; text: string } | null>(null);
  const [stars, setStars] = useState(done?.stars ?? 0);
  const [reward, setReward] = useState<{ xp: number; z: number } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);

  // 畫格子 + 機器人（dir 箭頭）
  const draw = (rx: number, ry: number, dir: number, gems: Set<string>, blocked = false) => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (let y = 0; y < parsed.H; y++) for (let x = 0; x < parsed.W; x++) {
      ctx.fillStyle = parsed.cells[y][x] === 1 ? "#1f2937" : "#0b3b2e";
      ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
    }
    ctx.font = "26px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const g of parsed.gems) if (!gems.has(`${g.x},${g.y}`)) ctx.fillText("💎", g.x * CELL + CELL / 2, g.y * CELL + CELL / 2);
    ctx.fillText("🎯", parsed.goal.x * CELL + CELL / 2, parsed.goal.y * CELL + CELL / 2);
    // 機器人
    ctx.save();
    ctx.translate(rx * CELL + CELL / 2, ry * CELL + CELL / 2);
    ctx.rotate((dir * Math.PI) / 2);
    ctx.fillText("🤖", 0, 0);
    ctx.restore();
    if (blocked) { ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 3; ctx.strokeRect(rx * CELL + 2, ry * CELL + 2, CELL - 4, CELL - 4); }
  };

  useEffect(() => { draw(parsed.start.x, parsed.start.y, level.startDir, new Set()); /* eslint-disable-next-line */ }, [parsed]);

  const stopAnim = () => { if (animRef.current) { clearTimeout(animRef.current); animRef.current = null; } };
  useEffect(() => () => stopAnim(), []);

  async function runCode() {
    if (running) return;
    setMsg(null); setReward(null); setRunning(true); stopAnim();
    try {
      const py = buildPython(parsed, level.startDir, code);
      const r = await run(py);
      if (!r.ok) { setMsg({ type: "err", text: (r.stderr || "程式出錯了").split("\n").filter(Boolean).slice(-2).join("\n") }); setRunning(false); return; }
      const tLine = r.stdout.split("\n").find((l) => l.startsWith("__TRAIL__"));
      const wLine = r.stdout.split("\n").find((l) => l.startsWith("__WIN__"));
      const trail: any[] = tLine ? JSON.parse(tLine.slice(9)) : [];
      const win = wLine ? JSON.parse(wLine.slice(7)) : { win: false, gems: 0, total: 0 };
      // 動畫
      let i = 0;
      const step = () => {
        const s = trail[i];
        const collected = new Set<string>();
        for (const g of parsed.gems) { const idxGem = trail.findIndex((t, k) => k <= i && t.x === g.x && t.y === g.y); if (idxGem >= 0) collected.add(`${g.x},${g.y}`); }
        draw(s.x, s.y, s.dir, collected, s.blocked);
        i++;
        if (i < trail.length) { animRef.current = window.setTimeout(step, 240); }
        else { finish(win); }
      };
      step();
    } catch (e: any) { setMsg({ type: "err", text: e?.message ?? "執行失敗" }); setRunning(false); }
  }

  async function finish(win: { win: boolean; gems: number; total: number }) {
    setRunning(false);
    if (!win.win) {
      setMsg({ type: "err", text: win.total > 0 && win.gems < win.total ? `還差 ${win.total - win.gems} 顆寶石，或沒走到旗子 🎯` : "還沒走到旗子 🎯，再想想路線？" });
      return;
    }
    const ln = codeLines(code);
    const earned = ln <= level.parLines ? 3 : ln <= level.parLines + 3 ? 2 : 1;
    setStars(earned);
    setMsg({ type: "ok", text: `過關！⭐ ${earned} 星（${ln} 行程式${earned < 3 ? `，${level.parLines} 行內拿 3 星` : "，最優解！"}）` });
    try {
      const res = await fetch("/api/quest/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ levelId: level.id, stars: earned }) }).then((r) => r.json());
      if (res.firstTime && res.awarded) setReward(res.awarded);
    } catch { /* 發獎失敗不影響過關 */ }
  }

  function resetLevel() { stopAnim(); setMsg(null); setReward(null); draw(parsed.start.x, parsed.start.y, level.startDir, new Set()); }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between gap-2 mb-4">
        <Link href="/quest" className="text-sm text-fg-muted hover:text-fg inline-flex items-center gap-1"><ArrowLeft size={14} /> 副本地圖</Link>
        <div className="text-xs text-fg-muted">觀念：<b className="text-accent">{level.concept}</b>{level.chapterHref && <> · <Link href={level.chapterHref} className="hover:text-accent underline">複習章節</Link></>}</div>
      </div>

      <h1 className="text-xl font-bold">{level.title} {stars > 0 && <span className="text-amber-400">{"★".repeat(stars)}{"☆".repeat(3 - stars)}</span>}</h1>
      <p className="text-sm text-fg-muted mt-1 mb-3">{level.intro}</p>

      <div className="grid md:grid-cols-2 gap-4">
        {/* 遊戲畫面 */}
        <div className="bg-bg-card border border-border rounded-2xl p-3 flex items-center justify-center overflow-auto">
          <canvas ref={canvasRef} width={parsed.W * CELL} height={parsed.H * CELL} className="rounded-lg" />
        </div>

        {/* 程式編輯 */}
        <div className="space-y-2">
          <textarea value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} rows={9}
            className="w-full bg-bg-elevated border border-border rounded-xl px-3 py-2 text-sm font-mono outline-none focus:border-accent resize-none" />
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={runCode} disabled={running || status !== "ready"} className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-accent text-black font-bold disabled:opacity-40">
              {status !== "ready" ? <><Loader2 size={16} className="animate-spin" /> 載入 Python…</> : running ? <><Loader2 size={16} className="animate-spin" /> 執行中</> : <><Play size={16} /> 執行</>}
            </button>
            <button onClick={resetLevel} className="inline-flex items-center gap-1 px-3 py-2 rounded-full border border-border text-sm text-fg-muted hover:text-fg"><RotateCcw size={14} /> 重來</button>
            <button onClick={() => setShowHint((v) => !v)} className="inline-flex items-center gap-1 px-3 py-2 rounded-full border border-border text-sm text-amber-500 hover:text-amber-400"><Lightbulb size={14} /> 提示</button>
          </div>
          {showHint && <div className="text-xs bg-amber-400/10 border border-amber-400/25 rounded-xl p-3 whitespace-pre-wrap"><b className="inline-flex items-center gap-1"><Sparkles size={12} /> 綠寶提示</b>{"\n"}{level.hint}{"\n\n"}可用指令：move() / turn_left() / turn_right() / wall_ahead() / at_goal()</div>}
          {msg && <div className={`text-sm rounded-xl px-3 py-2 whitespace-pre-wrap ${msg.type === "ok" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300" : msg.type === "err" ? "bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300" : "bg-bg-elevated"}`}>{msg.text}</div>}
          {reward && <div className="text-sm bg-gradient-to-r from-amber-400/15 to-yellow-400/10 border border-amber-400/30 rounded-xl px-3 py-2 font-bold">🎁 首次通關獎勵：+{reward.xp} XP · +{reward.z} Z 幣</div>}
        </div>
      </div>
    </div>
  );
}
