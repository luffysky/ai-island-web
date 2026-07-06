"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePyodide } from "@/hooks/usePyodide";
import type { QuestLevel } from "@/lib/quest/levels";
import { ROBOT, GEM, FLAG, spriteCanvas } from "@/lib/quest/sprites";
import { QuestShell, QS } from "../QuestShell";
import { Play, RotateCcw, Loader2, Lightbulb, Sparkles } from "lucide-react";

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
  return `import sys
_ops=[0]
def _trace(f,e,a):
    _ops[0]+=1
    if _ops[0]>400000: raise RuntimeError("執行太久了（是不是無限迴圈？）")
    return _trace
sys.settrace(_trace)
_grid=${JSON.stringify(p.cells)}
_gx,_gy=${p.goal.x},${p.goal.y}
_gems=${JSON.stringify(p.gems.map((g) => [g.x, g.y]))}
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

// 音效：WebAudio 合成（零素材/零授權/離線可用）。
let _ac: AudioContext | null = null;
function sfx(kind: "step" | "blocked" | "win" | "fail" | "gem") {
  try {
    if (typeof window === "undefined") return;
    _ac = _ac || new (window.AudioContext || (window as any).webkitAudioContext)();
    const ac = _ac, now = ac.currentTime;
    const beep = (freq: number, start: number, dur: number, type: OscillatorType = "square", vol = 0.06) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.value = freq; o.connect(g); g.connect(ac.destination);
      g.gain.setValueAtTime(0, now + start);
      g.gain.linearRampToValueAtTime(vol, now + start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      o.start(now + start); o.stop(now + start + dur + 0.02);
    };
    if (kind === "step") beep(440, 0, 0.07, "square", 0.03);
    else if (kind === "gem") { beep(880, 0, 0.08, "square", 0.05); beep(1320, 0.06, 0.1, "square", 0.04); }
    else if (kind === "blocked") beep(120, 0, 0.16, "sawtooth", 0.05);
    else if (kind === "fail") { beep(300, 0, 0.14, "triangle"); beep(200, 0.12, 0.2, "triangle"); }
    else if (kind === "win") { [523, 659, 784, 1047].forEach((f, i) => beep(f, i * 0.09, 0.14, "square", 0.05)); }
  } catch { /* 音效失敗不影響遊戲 */ }
}

const CELL = 48;

export function QuestPlay({ level, done }: { level: QuestLevel; done: { stars: number } | null }) {
  const parsed = useMemo(() => parseGrid(level.grid), [level.grid]);
  const { status, run } = usePyodide(true);
  const [code, setCode] = useState(level.starter);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err" | "info"; text: string } | null>(null);
  const [stars, setStars] = useState(done?.stars ?? 0);
  const [reward, setReward] = useState<{ xp: number; z: number } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [pixiErr, setPixiErr] = useState(false);

  const mountRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<any>(null);
  const robotRef = useRef<any>(null);
  const gemSpritesRef = useRef<Map<string, any>>(new Map());
  const animRef = useRef<number | null>(null);

  // 建立 PixiJS 場景（換關重建）
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const PIXI: any = await import("pixi.js");
        if (dead || !mountRef.current) return;
        const app = new PIXI.Application();
        await app.init({ width: parsed.W * CELL, height: parsed.H * CELL, backgroundAlpha: 0, antialias: false });
        if (dead) { app.destroy(true); return; }
        mountRef.current.innerHTML = "";
        mountRef.current.appendChild(app.canvas);
        app.canvas.style.maxWidth = "100%";
        app.canvas.style.height = "auto";
        app.canvas.style.borderRadius = "10px";
        appRef.current = app;

        const tex = (s: any) => new PIXI.Texture({ source: new PIXI.CanvasSource({ resource: spriteCanvas(s), scaleMode: "nearest" }) });
        const robotTex = tex(ROBOT), gemTex = tex(GEM), flagTex = tex(FLAG);

        // 地磚 / 牆
        const board = new PIXI.Graphics();
        for (let y = 0; y < parsed.H; y++) for (let x = 0; x < parsed.W; x++) {
          const wall = parsed.cells[y][x] === 1;
          board.roundRect(x * CELL + 1.5, y * CELL + 1.5, CELL - 3, CELL - 3, 6).fill(wall ? 0x1f2937 : 0x0d3b2e);
          if (!wall) board.roundRect(x * CELL + 4, y * CELL + 4, CELL - 8, CELL - 8, 5).stroke({ color: 0xffffff, alpha: 0.05, width: 1 });
        }
        app.stage.addChild(board);

        // 終點
        const flag = new PIXI.Sprite(flagTex); flag.anchor.set(0.5); flag.width = CELL * 0.7; flag.height = CELL * 0.7;
        flag.x = (parsed.goal.x + 0.5) * CELL; flag.y = (parsed.goal.y + 0.5) * CELL; app.stage.addChild(flag);

        // 寶石
        gemSpritesRef.current.clear();
        for (const g of parsed.gems) {
          const gs = new PIXI.Sprite(gemTex); gs.anchor.set(0.5); gs.width = CELL * 0.55; gs.height = CELL * 0.55;
          gs.x = (g.x + 0.5) * CELL; gs.y = (g.y + 0.5) * CELL; app.stage.addChild(gs);
          gemSpritesRef.current.set(`${g.x},${g.y}`, gs);
        }

        // 機器人
        const robot = new PIXI.Sprite(robotTex); robot.anchor.set(0.5); robot.width = CELL * 0.78; robot.height = CELL * 0.78;
        robot.x = (parsed.start.x + 0.5) * CELL; robot.y = (parsed.start.y + 0.5) * CELL; robot.rotation = (level.startDir * Math.PI) / 2;
        app.stage.addChild(robot); robotRef.current = robot;
      } catch (e) { setPixiErr(true); }
    })();
    return () => { dead = true; if (animRef.current) clearTimeout(animRef.current); const a = appRef.current; appRef.current = null; if (a) try { a.destroy(true); } catch { /* noop */ } };
  }, [parsed, level.startDir]);

  function placeRobot(x: number, y: number, dir: number, blocked: boolean) {
    const r = robotRef.current; if (!r) return;
    r.x = (x + 0.5) * CELL; r.y = (y + 0.5) * CELL; r.rotation = (dir * Math.PI) / 2;
    r.tint = blocked ? 0xff6b6b : 0xffffff;
  }
  function resetScene() {
    for (const gs of gemSpritesRef.current.values()) gs.visible = true;
    placeRobot(parsed.start.x, parsed.start.y, level.startDir, false);
  }
  const stopAnim = () => { if (animRef.current) { clearTimeout(animRef.current); animRef.current = null; } };
  useEffect(() => () => stopAnim(), []);

  async function runCode() {
    if (running) return;
    setMsg(null); setReward(null); setRunning(true); stopAnim(); resetScene();
    try {
      const r = await run(buildPython(parsed, level.startDir, code));
      if (!r.ok) { setMsg({ type: "err", text: (r.stderr || "程式出錯了").split("\n").filter(Boolean).slice(-2).join("\n") }); setRunning(false); return; }
      const tLine = r.stdout.split("\n").find((l) => l.startsWith("__TRAIL__"));
      const wLine = r.stdout.split("\n").find((l) => l.startsWith("__WIN__"));
      const trail: any[] = tLine ? JSON.parse(tLine.slice(9)) : [];
      const win = wLine ? JSON.parse(wLine.slice(7)) : { win: false, gems: 0, total: 0 };
      let i = 0;
      const step = () => {
        const s = trail[i];
        placeRobot(s.x, s.y, s.dir, s.blocked);
        const gm = gemSpritesRef.current.get(`${s.x},${s.y}`);
        if (gm && gm.visible) { gm.visible = false; if (i > 0) sfx("gem"); }
        else if (i > 0) sfx(s.blocked ? "blocked" : "step");
        i++;
        if (i < trail.length) { animRef.current = window.setTimeout(step, 230); } else { finish(win); }
      };
      step();
    } catch (e: any) { setMsg({ type: "err", text: e?.message ?? "執行失敗" }); setRunning(false); }
  }

  async function finish(win: { win: boolean; gems: number; total: number }) {
    setRunning(false);
    if (!win.win) {
      sfx("fail");
      setMsg({ type: "err", text: win.total > 0 && win.gems < win.total ? `還差 ${win.total - win.gems} 顆寶石，或沒走到旗子 🎯` : "還沒走到旗子 🎯，再想想路線？" });
      return;
    }
    sfx("win");
    const ln = codeLines(code);
    const earned = ln <= level.parLines ? 3 : ln <= level.parLines + 3 ? 2 : 1;
    setStars(earned);
    setMsg({ type: "ok", text: `過關！⭐ ${earned} 星（${ln} 行程式${earned < 3 ? `，${level.parLines} 行內拿 3 星` : "，最優解！"}）` });
    try {
      const res = await fetch("/api/quest/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ levelId: level.id, stars: earned }) }).then((r) => r.json());
      if (res.firstTime && res.awarded) setReward(res.awarded);
    } catch { /* 發獎失敗不影響過關 */ }
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
          {showHint && <div className={QS.hint}><b className="inline-flex items-center gap-1"><Sparkles size={12} /> 綠寶提示</b>{"\n"}{level.hint}{"\n\n"}可用指令：move() / turn_left() / turn_right() / wall_ahead() / at_goal()</div>}
          {msg && <div className={`text-sm rounded-xl px-3 py-2 whitespace-pre-wrap ${msg.type === "ok" ? "bg-emerald-500/15 border border-emerald-400/40 text-emerald-200" : msg.type === "err" ? "bg-red-500/15 border border-red-400/40 text-red-200" : "bg-white/5"}`}>{msg.text}</div>}
          {reward && <div className="text-sm bg-gradient-to-r from-amber-400/20 to-yellow-400/10 border border-amber-400/40 rounded-xl px-3 py-2 font-bold text-amber-100">🎁 首次通關獎勵：+{reward.xp} XP · +{reward.z} Z 幣</div>}
        </div>
      </div>
    </QuestShell>
  );
}
