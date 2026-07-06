"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePyodide } from "@/hooks/usePyodide";
import type { PaintLevel } from "@/lib/quest/paint-levels";
import { ROBOT, spriteCanvas } from "@/lib/quest/sprites";
import { TRACE_GUARD, TRACE_OFF, codeLines, starsFor, submitCompletion, shortErr, sfx, parseTag } from "@/lib/quest/engine";
import { QuestShell, QS } from "../../QuestShell";
import { Play, RotateCcw, Loader2, Lightbulb, Sparkles } from "lucide-react";

type Parsed = { cells: number[][]; W: number; H: number; start: { x: number; y: number }; targets: { x: number; y: number }[] };
function parseGrid(grid: string[]): Parsed {
  const H = grid.length, W = Math.max(...grid.map((r) => r.length));
  const cells: number[][] = [], targets: { x: number; y: number }[] = [];
  let start = { x: 0, y: 0 };
  for (let y = 0; y < H; y++) {
    const row: number[] = [];
    for (let x = 0; x < W; x++) {
      const ch = grid[y][x] ?? ".";
      row.push(ch === "#" ? 1 : 0);
      if (ch === "S") start = { x, y };
      else if (ch === "T") targets.push({ x, y });
    }
    cells.push(row);
  }
  return { cells, W, H, start, targets };
}

function buildPython(p: Parsed, startDir: number, userCode: string): string {
  return `${TRACE_GUARD}_grid=${JSON.stringify(p.cells)}
_target=${JSON.stringify(p.targets.map((t) => [t.x, t.y]))}
rx,ry,rdir=${p.start.x},${p.start.y},${startDir}
_W,_H=${p.W},${p.H}
_DX=[0,1,0,-1]; _DY=[-1,0,1,0]
_painted=set()
_trail=[{"x":rx,"y":ry,"dir":rdir,"paint":False,"blocked":False}]
def _cell(x,y):
    if x<0 or y<0 or x>=_W or y>=_H: return 1
    return _grid[y][x]
def _rec(paint=False,blocked=False):
    _trail.append({"x":rx,"y":ry,"dir":rdir,"paint":paint,"blocked":blocked})
    if len(_trail)>800: raise RuntimeError("步數太多了")
def move():
    global rx,ry
    nx,ny=rx+_DX[rdir],ry+_DY[rdir]
    if _cell(nx,ny)==1:
        _rec(blocked=True); return
    rx,ry=nx,ny; _rec()
def turn_left():
    global rdir; rdir=(rdir-1)%4; _rec()
def turn_right():
    global rdir; rdir=(rdir+1)%4; _rec()
def paint():
    _painted.add((rx,ry)); _rec(paint=True)
${userCode}${TRACE_OFF}import json
print("__TRAIL__"+json.dumps(_trail))
print("__WIN__"+json.dumps({"win": _painted==set(tuple(t) for t in _target), "painted": len(_painted), "target": len(_target)}))
`;
}

const CELL = 48;

export function PaintPlay({ level, done }: { level: PaintLevel; done: { stars: number } | null }) {
  const parsed = useMemo(() => parseGrid(level.grid), [level.grid]);
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
  const robotRef = useRef<any>(null);
  const paintLayerRef = useRef<any>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const PIXI: any = await import("pixi.js");
        if (dead || !mountRef.current) return;
        const app = new PIXI.Application();
        await app.init({ width: parsed.W * CELL, height: parsed.H * CELL, backgroundAlpha: 0, antialias: false });
        if (dead) { app.destroy(true); return; }
        mountRef.current.innerHTML = ""; mountRef.current.appendChild(app.canvas);
        app.canvas.style.maxWidth = "100%"; app.canvas.style.height = "auto"; app.canvas.style.borderRadius = "10px";
        appRef.current = app;

        const board = new PIXI.Graphics();
        for (let y = 0; y < parsed.H; y++) for (let x = 0; x < parsed.W; x++) {
          const wall = parsed.cells[y][x] === 1;
          board.roundRect(x * CELL + 1.5, y * CELL + 1.5, CELL - 3, CELL - 3, 6).fill(wall ? 0x1f2937 : 0x0d3b2e);
        }
        // 目標格外框（要塗的地方）
        for (const t of parsed.targets) board.roundRect(t.x * CELL + 4, t.y * CELL + 4, CELL - 8, CELL - 8, 5).stroke({ color: 0xfbbf24, alpha: 0.8, width: 2 });
        app.stage.addChild(board);

        const paintLayer = new PIXI.Graphics(); app.stage.addChild(paintLayer); paintLayerRef.current = paintLayer;

        const robotTex = new PIXI.Texture({ source: new PIXI.CanvasSource({ resource: spriteCanvas(ROBOT), scaleMode: "nearest" }) });
        const robot = new PIXI.Sprite(robotTex); robot.anchor.set(0.5); robot.width = CELL * 0.78; robot.height = CELL * 0.78;
        robot.x = (parsed.start.x + 0.5) * CELL; robot.y = (parsed.start.y + 0.5) * CELL; robot.rotation = (level.startDir * Math.PI) / 2;
        app.stage.addChild(robot); robotRef.current = robot;
      } catch { setPixiErr(true); }
    })();
    return () => { dead = true; if (animRef.current) clearTimeout(animRef.current); const a = appRef.current; appRef.current = null; if (a) try { a.destroy(true); } catch { /* noop */ } };
  }, [parsed, level.startDir]);

  function placeRobot(x: number, y: number, dir: number, blocked: boolean) {
    const r = robotRef.current; if (!r) return;
    r.x = (x + 0.5) * CELL; r.y = (y + 0.5) * CELL; r.rotation = (dir * Math.PI) / 2; r.tint = blocked ? 0xff6b6b : 0xffffff;
  }
  function paintCell(x: number, y: number) {
    const pl = paintLayerRef.current; if (!pl) return;
    pl.roundRect(x * CELL + 4, y * CELL + 4, CELL - 8, CELL - 8, 5).fill({ color: 0x34d399, alpha: 0.85 });
  }
  function resetScene() { paintLayerRef.current?.clear(); placeRobot(parsed.start.x, parsed.start.y, level.startDir, false); }
  const stopAnim = () => { if (animRef.current) { clearTimeout(animRef.current); animRef.current = null; } };
  useEffect(() => () => stopAnim(), []);

  async function runCode() {
    if (running) return;
    setMsg(null); setReward(null); setRunning(true); stopAnim(); resetScene();
    try {
      const r = await run(buildPython(parsed, level.startDir, code));
      if (!r.ok) { setMsg({ type: "err", text: shortErr(r.stderr) }); setRunning(false); return; }
      const trail = parseTag<any[]>(r.stdout, "__TRAIL__") ?? [];
      const win = parseTag<{ win: boolean; painted: number; target: number }>(r.stdout, "__WIN__") ?? { win: false, painted: 0, target: 0 };
      let i = 0;
      const step = () => {
        const s = trail[i];
        placeRobot(s.x, s.y, s.dir, s.blocked);
        if (s.paint) { paintCell(s.x, s.y); if (i > 0) sfx("paint"); }
        else if (i > 0) sfx(s.blocked ? "blocked" : "step");
        i++;
        if (i < trail.length) animRef.current = window.setTimeout(step, 220); else finish(win);
      };
      step();
    } catch (e: any) { setMsg({ type: "err", text: e?.message ?? "執行失敗" }); setRunning(false); }
  }

  async function finish(win: { win: boolean; painted: number; target: number }) {
    setRunning(false);
    if (!win.win) { sfx("fail"); setMsg({ type: "err", text: `圖案還不對（塗了 ${win.painted} 格 / 目標 ${win.target} 格）——多的或少的都不行喔` }); return; }
    sfx("win");
    const s = starsFor(codeLines(code), level.parLines); setStars(s);
    setMsg({ type: "ok", text: `完成圖案！⭐ ${s} 星（${codeLines(code)} 行）` });
    const aw = await submitCompletion(level.id, s); if (aw) setReward(aw);
  }

  function resetLevel() { stopAnim(); setMsg(null); setReward(null); resetScene(); }

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
              {status !== "ready" ? <><Loader2 size={16} className="animate-spin" /> 載入 Python…</> : running ? <><Loader2 size={16} className="animate-spin" /> 執行中</> : <><Play size={16} /> 執行</>}
            </button>
            <button onClick={resetLevel} className={QS.ghostBtn}><RotateCcw size={14} /> 重來</button>
            <button onClick={() => setShowHint((v) => !v)} className={`${QS.ghostBtn} !text-amber-400`}><Lightbulb size={14} /> 提示</button>
          </div>
          {showHint && <div className={QS.hint}><b className="inline-flex items-center gap-1"><Sparkles size={12} /> 綠寶提示</b>{"\n"}{level.hint}{"\n\n"}可用指令：move() / turn_left() / turn_right() / paint()</div>}
          {msg && <div className={`text-sm rounded-xl px-3 py-2 whitespace-pre-wrap ${msg.type === "ok" ? "bg-emerald-500/15 border border-emerald-400/40 text-emerald-200" : "bg-red-500/15 border border-red-400/40 text-red-200"}`}>{msg.text}</div>}
          {reward && <div className="text-sm bg-gradient-to-r from-amber-400/20 to-yellow-400/10 border border-amber-400/40 rounded-xl px-3 py-2 font-bold text-amber-100">🎁 首次通關獎勵：+{reward.xp} XP · +{reward.z} Z 幣</div>}
        </div>
      </div>
    </QuestShell>
  );
}
