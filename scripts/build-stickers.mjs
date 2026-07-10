/**
 * 自建一組「可愛動態貼圖」（自繪 SVG、CSS 動畫、筆畫粗、零版權）。
 * 輸出到 public/stickers/*.svg —— SVG 內含 <style> @keyframes，當成 <img> 載入時動畫照跑。
 * 用法：node scripts/build-stickers.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";

const OUT = "public/stickers";
mkdirSync(OUT, { recursive: true });

// 共用：圓臉 blob（粗外框）。face(bg, stroke)
const face = (bg, stroke) =>
  `<circle cx="50" cy="52" r="34" fill="${bg}" stroke="${stroke}" stroke-width="6"/>`;

// 每個貼圖：id、label、外框色、臉色、五官(SVG)、動畫類型(bounce|wiggle|pop|spin)
const S = [
  {
    id: "happy", label: "開心", bg: "#b9f6ca", stroke: "#1b5e20", anim: "bounce",
    parts: `<path d="M36 46 q4 -6 8 0" fill="none" stroke="#1b5e20" stroke-width="4" stroke-linecap="round"/>
<path d="M56 46 q4 -6 8 0" fill="none" stroke="#1b5e20" stroke-width="4" stroke-linecap="round"/>
<path d="M38 60 q12 12 24 0" fill="none" stroke="#1b5e20" stroke-width="5" stroke-linecap="round"/>
<circle cx="30" cy="58" r="4" fill="#ff8a80"/><circle cx="70" cy="58" r="4" fill="#ff8a80"/>`,
  },
  {
    id: "love", label: "愛你", bg: "#ffcdd2", stroke: "#b71c1c", anim: "pop",
    parts: `<path d="M34 50 l4 4 4 -4 a3 3 0 0 0 -8 -2 z" fill="#e53935"/>
<path d="M58 50 l4 4 4 -4 a3 3 0 0 0 -8 -2 z" fill="#e53935"/>
<path d="M40 62 q10 8 20 0" fill="none" stroke="#b71c1c" stroke-width="5" stroke-linecap="round"/>`,
  },
  {
    id: "lol", label: "大笑", bg: "#fff59d", stroke: "#f57f17", anim: "bounce",
    parts: `<path d="M32 46 l10 6 -10 6" fill="none" stroke="#5d4037" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M68 46 l-10 6 10 6" fill="none" stroke="#5d4037" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M36 60 q14 16 28 0 z" fill="#c62828" stroke="#7f0000" stroke-width="3" stroke-linejoin="round"/>`,
  },
  {
    id: "cry", label: "哭哭", bg: "#bbdefb", stroke: "#0d47a1", anim: "wiggle",
    parts: `<path d="M34 48 q4 -5 8 0" fill="none" stroke="#0d47a1" stroke-width="4" stroke-linecap="round"/>
<path d="M58 48 q4 -5 8 0" fill="none" stroke="#0d47a1" stroke-width="4" stroke-linecap="round"/>
<path d="M40 66 q10 -8 20 0" fill="none" stroke="#0d47a1" stroke-width="5" stroke-linecap="round"/>
<path class="tear" d="M36 54 q-3 8 0 12 q3 -4 0 -12z" fill="#4fc3f7"/>
<path class="tear" d="M64 54 q-3 8 0 12 q3 -4 0 -12z" fill="#4fc3f7"/>`,
  },
  {
    id: "wink", label: "眨眼", bg: "#e1bee7", stroke: "#4a148c", anim: "pop",
    parts: `<path d="M32 50 q6 -4 12 0" fill="none" stroke="#4a148c" stroke-width="4" stroke-linecap="round"/>
<circle cx="62" cy="50" r="5" fill="#4a148c"/>
<path d="M38 62 q12 8 22 -2" fill="none" stroke="#4a148c" stroke-width="5" stroke-linecap="round"/>
<circle cx="72" cy="60" r="4" fill="#f48fb1"/>`,
  },
  {
    id: "sleepy", label: "想睡", bg: "#c5cae9", stroke: "#1a237e", anim: "wiggle",
    parts: `<path d="M32 50 h12" stroke="#1a237e" stroke-width="4" stroke-linecap="round"/>
<path d="M56 50 h12" stroke="#1a237e" stroke-width="4" stroke-linecap="round"/>
<circle cx="50" cy="64" r="4" fill="none" stroke="#1a237e" stroke-width="3"/>
<text class="zzz" x="72" y="30" font-size="16" fill="#1a237e" font-family="sans-serif" font-weight="bold">z</text>`,
  },
  {
    id: "wow", label: "驚訝", bg: "#ffe0b2", stroke: "#e65100", anim: "pop",
    parts: `<circle cx="38" cy="49" r="6" fill="#fff" stroke="#e65100" stroke-width="3"/><circle cx="38" cy="49" r="2.5" fill="#3e2723"/>
<circle cx="62" cy="49" r="6" fill="#fff" stroke="#e65100" stroke-width="3"/><circle cx="62" cy="49" r="2.5" fill="#3e2723"/>
<ellipse cx="50" cy="66" rx="6" ry="8" fill="#bf360c"/>`,
  },
  {
    id: "cool", label: "酷", bg: "#b2ebf2", stroke: "#006064", anim: "bounce",
    parts: `<rect x="28" y="44" width="18" height="12" rx="3" fill="#111"/>
<rect x="54" y="44" width="18" height="12" rx="3" fill="#111"/>
<path d="M46 50 h8" stroke="#111" stroke-width="3"/>
<path d="M40 64 q10 6 20 -2" fill="none" stroke="#006064" stroke-width="5" stroke-linecap="round"/>`,
  },
  {
    id: "angry", label: "生氣", bg: "#ffab91", stroke: "#bf360c", anim: "wiggle",
    parts: `<path d="M32 44 l12 4" stroke="#bf360c" stroke-width="4" stroke-linecap="round"/>
<path d="M68 44 l-12 4" stroke="#bf360c" stroke-width="4" stroke-linecap="round"/>
<circle cx="38" cy="53" r="3.5" fill="#5d4037"/><circle cx="62" cy="53" r="3.5" fill="#5d4037"/>
<path d="M40 66 q10 -6 20 0" fill="none" stroke="#bf360c" stroke-width="5" stroke-linecap="round"/>
<path class="steam" d="M76 40 q6 -4 0 -8" fill="none" stroke="#bf360c" stroke-width="3" stroke-linecap="round"/>`,
  },
  {
    id: "yes", label: "讚啦", bg: "#c8e6c9", stroke: "#1b5e20", anim: "pop",
    parts: `<path d="M34 48 q5 -5 10 0" fill="none" stroke="#1b5e20" stroke-width="4" stroke-linecap="round"/>
<path d="M56 48 q5 -5 10 0" fill="none" stroke="#1b5e20" stroke-width="4" stroke-linecap="round"/>
<path d="M40 60 q10 10 20 0" fill="none" stroke="#1b5e20" stroke-width="5" stroke-linecap="round"/>
<text class="spark" x="68" y="34" font-size="16">✨</text>`,
  },
  {
    id: "hi", label: "嗨", bg: "#fff9c4", stroke: "#f9a825", anim: "wiggle",
    parts: `<circle cx="38" cy="50" r="4" fill="#5d4037"/><circle cx="62" cy="50" r="4" fill="#5d4037"/>
<path d="M40 62 q10 8 20 0" fill="none" stroke="#f9a825" stroke-width="5" stroke-linecap="round"/>
<g class="wave"><path d="M78 60 q10 -6 8 -18" fill="none" stroke="#f9a825" stroke-width="5" stroke-linecap="round"/></g>`,
  },
  {
    id: "shy", label: "害羞", bg: "#f8bbd0", stroke: "#880e4f", anim: "pop",
    parts: `<path d="M34 50 q5 -4 10 0" fill="none" stroke="#880e4f" stroke-width="4" stroke-linecap="round"/>
<path d="M56 50 q5 -4 10 0" fill="none" stroke="#880e4f" stroke-width="4" stroke-linecap="round"/>
<path d="M44 62 q6 5 12 0" fill="none" stroke="#880e4f" stroke-width="4" stroke-linecap="round"/>
<circle class="blush" cx="30" cy="58" r="5" fill="#f06292"/><circle class="blush" cx="70" cy="58" r="5" fill="#f06292"/>`,
  },
];

const ANIM = `
<style>
  .body{transform-origin:50px 60px}
  .bounce{animation:bounce 1s ease-in-out infinite}
  .wiggle{animation:wiggle 1.1s ease-in-out infinite}
  .pop{animation:pop 1.2s ease-in-out infinite}
  @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
  @keyframes wiggle{0%,100%{transform:rotate(-5deg)}50%{transform:rotate(5deg)}}
  @keyframes pop{0%,100%{transform:scale(1)}50%{transform:scale(1.09)}}
  .tear{animation:tear 1.4s ease-in infinite}
  @keyframes tear{0%{opacity:0;transform:translateY(-4px)}30%{opacity:1}100%{opacity:0;transform:translateY(10px)}}
  .zzz{animation:zzz 1.8s ease-in-out infinite}
  @keyframes zzz{0%{opacity:0;transform:translate(0,4px)}40%{opacity:1}100%{opacity:0;transform:translate(6px,-8px)}}
  .steam{animation:steam .7s ease-in-out infinite}
  @keyframes steam{0%,100%{opacity:.3;transform:translateY(0)}50%{opacity:1;transform:translateY(-3px)}}
  .spark{animation:pop 1s ease-in-out infinite}
  .wave{transform-origin:80px 60px;animation:wave .5s ease-in-out infinite}
  @keyframes wave{0%,100%{transform:rotate(-14deg)}50%{transform:rotate(14deg)}}
  .blush{animation:steam 1.5s ease-in-out infinite}
</style>`;

for (const s of S) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">${ANIM}
<g class="body ${s.anim}">${face(s.bg, s.stroke)}${s.parts}</g>
</svg>`;
  writeFileSync(`${OUT}/${s.id}.svg`, svg);
  console.log(`  ✓ ${s.id}.svg (${s.label})`);
}

// 清單維護在 src/lib/stickers.ts（前端 import 用）。新增/刪貼圖時記得兩邊都改。
console.log(`\n共 ${S.length} 張貼圖 → ${OUT}/  （清單見 src/lib/stickers.ts）`);
