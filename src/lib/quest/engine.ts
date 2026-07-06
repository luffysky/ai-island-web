/**
 * Code Quest 共用引擎：音效、行數/星等、Pyodide 防呆前綴、發獎。
 * 4 種遊戲（迷宮/畫圖/Turtle/數字/抓蟲）共用，避免每個各抄一份。
 */

// ── 音效：WebAudio 合成（零素材/零授權/離線）──────────────
let _ac: AudioContext | null = null;
export type SfxKind = "step" | "blocked" | "win" | "fail" | "gem" | "paint";
export function sfx(kind: SfxKind) {
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
    else if (kind === "paint") beep(660, 0, 0.07, "square", 0.04);
    else if (kind === "gem") { beep(880, 0, 0.08, "square", 0.05); beep(1320, 0.06, 0.1, "square", 0.04); }
    else if (kind === "blocked") beep(120, 0, 0.16, "sawtooth", 0.05);
    else if (kind === "fail") { beep(300, 0, 0.14, "triangle"); beep(200, 0.12, 0.2, "triangle"); }
    else if (kind === "win") { [523, 659, 784, 1047].forEach((f, i) => beep(f, i * 0.09, 0.14, "square", 0.05)); }
  } catch { /* 音效失敗不影響遊戲 */ }
}

// ── 行數 / 星等 ───────────────────────────────────────────
export function codeLines(code: string): number {
  return code.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).length;
}
export function starsFor(lines: number, par: number): 1 | 2 | 3 {
  return lines <= par ? 3 : lines <= par + 3 ? 2 : 1;
}

// ── Pyodide：防無限迴圈的 settrace 前綴 ──────────────────
export const TRACE_GUARD = `import sys
_ops=[0]
def _trace(f,e,a):
    _ops[0]+=1
    if _ops[0]>400000: raise RuntimeError("執行太久了（是不是無限迴圈？）")
    return _trace
sys.settrace(_trace)
`;
export const TRACE_OFF = `\nsys.settrace(None)\n`;

/** 取 stdout 裡某標記行後的 JSON。 */
export function parseTag<T>(stdout: string, tag: string): T | null {
  const line = stdout.split("\n").find((l) => l.startsWith(tag));
  if (!line) return null;
  try { return JSON.parse(line.slice(tag.length)) as T; } catch { return null; }
}

// ── 發獎（首次通關）──────────────────────────────────────
export async function submitCompletion(levelId: string, stars: number): Promise<{ xp: number; z: number } | null> {
  try {
    const res = await fetch("/api/quest/complete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ levelId, stars }),
    }).then((r) => r.json());
    return res.firstTime && res.awarded ? res.awarded : null;
  } catch { return null; }
}

/** 短化 Python 錯誤訊息給玩家看。 */
export function shortErr(stderr: string): string {
  return (stderr || "程式出錯了").split("\n").filter(Boolean).slice(-2).join("\n");
}
