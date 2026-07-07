"use client";

import { useEffect, useRef, useState } from "react";
import type { CssLevel } from "@/lib/quest/css-levels";
import { starsFor, submitCompletion, sfx } from "@/lib/quest/engine";
import { QuestShell, QS } from "../../QuestShell";
import { Play, RotateCcw, Lightbulb, Sparkles } from "lucide-react";

const cssLines = (s: string) => s.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("/*") && l !== "*/").length;

export function CssPlay({ level, done }: { level: CssLevel; done: { stars: number } | null }) {
  const [css, setCss] = useState(level.starter);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [stars, setStars] = useState(done?.stars ?? 0);
  const [reward, setReward] = useState<{ xp: number; z: number } | null>(null);
  const [showHint, setShowHint] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:14px;background:transparent}${level.baseCss}\n${css}</style></head><body>${level.html}</body></html>`;

  // 清掉可能被卡住的訊息（改 CSS 就重置提示）
  useEffect(() => { setMsg(null); }, [css]);

  async function check() {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) { setMsg({ type: "err", text: "預覽還沒載好，再按一次 🙏" }); return; }
    const box = doc.getElementById("box");
    const goal = doc.getElementById("goal");
    if (!box || !goal) { setMsg({ type: "err", text: "找不到方塊或目標，別動到 HTML 結構喔" }); return; }
    const b = box.getBoundingClientRect();
    const g = goal.getBoundingClientRect();
    const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    const tol = 6; // 容錯幾 px
    const inside = cx >= g.left - tol && cx <= g.right + tol && cy >= g.top - tol && cy <= g.bottom + tol;
    if (inside) {
      const s = starsFor(cssLines(css), level.parLines); setStars(s); sfx("win");
      setMsg({ type: "ok", text: `對準了！⭐ ${s} 星（${cssLines(css)} 行 CSS）` });
      const aw = await submitCompletion(level.id, s); if (aw) setReward(aw);
    } else {
      setMsg({ type: "err", text: "方塊還沒對到虛線目標，再調一下位置 🤔" });
      sfx("fail");
    }
  }

  return (
    <QuestShell title={level.title} concept={level.concept} chapterHref={level.chapterHref} stars={stars} intro={level.intro}>
      {/* 即時預覽 */}
      <div className={`${QS.panel} p-4 mb-3 grid place-items-center`}>
        <iframe
          ref={iframeRef}
          title="CSS 預覽"
          sandbox="allow-same-origin"
          srcDoc={srcDoc}
          className="w-full max-w-[308px] h-[208px] bg-transparent"
        />
      </div>

      <textarea value={css} onChange={(e) => setCss(e.target.value)} spellCheck={false} rows={8} className={QS.editor} />
      <div className="flex items-center gap-2 flex-wrap mt-2">
        <button onClick={check} className={QS.runBtn}><Play size={16} /> 檢查</button>
        <button onClick={() => { setCss(level.starter); setMsg(null); }} className={QS.ghostBtn}><RotateCcw size={14} /> 重來</button>
        <button onClick={() => setShowHint((v) => !v)} className={`${QS.ghostBtn} !text-amber-400`}><Lightbulb size={14} /> 提示</button>
      </div>
      {showHint && <div className={`${QS.hint} mt-2`}><b className="inline-flex items-center gap-1"><Sparkles size={12} /> 綠寶提示</b>{"\n"}{level.hint}</div>}
      {msg && <div className={`text-sm rounded-xl px-3 py-2 mt-2 ${msg.type === "ok" ? "bg-emerald-500/15 border border-emerald-400/40 text-emerald-200" : "bg-red-500/15 border border-red-400/40 text-red-200"}`}>{msg.text}</div>}
      {reward && <div className="text-sm bg-gradient-to-r from-amber-400/20 to-yellow-400/10 border border-amber-400/40 rounded-xl px-3 py-2 mt-2 font-bold text-amber-100">🎁 首次通關獎勵：+{reward.xp} XP · +{reward.z} Z 幣</div>}
    </QuestShell>
  );
}
