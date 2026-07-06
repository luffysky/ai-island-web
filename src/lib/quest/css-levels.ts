/**
 * 🎯 前端 CSS 關卡：玩家寫 CSS 把 #box 移進 #goal 目標框。
 * 用 iframe(srcDoc) 即時渲染，父層量測 #box 中心是否落在 #goal 內判定過關（不需 Pyodide / WebGL）。
 * baseCss 固定舞台與 goal 位置；玩家只寫自己的 CSS。多種解法都通（flex / absolute / margin…）。
 */
export type CssLevel = {
  id: string; title: string; concept: string; chapterHref?: string;
  intro: string; hint: string;
  html: string;        // body 內容
  baseCss: string;     // 固定樣式（舞台 / box / goal 位置）— 不可改
  starter: string;     // 玩家起始 CSS
  parLines: number; xp: number; z: number;
};

// 共用舞台：280x180 的框，#box 40x40 在流內（預設左上），#goal 是虛線目標（絕對定位、不影響排版）
const STAGE = `.stage{position:relative;width:280px;height:180px;margin:0 auto;background:#0b1020;border:1px solid rgba(255,255,255,.15);border-radius:12px;overflow:hidden}
#box{width:40px;height:40px;background:#8be9fd;border-radius:8px}
#goal{position:absolute;width:40px;height:40px;border:2px dashed #50fa7b;border-radius:8px;box-sizing:border-box}`;

const HTML = `<div class="stage"><div id="goal"></div><div id="box"></div></div>`;

export const CSS_LEVELS: CssLevel[] = [
  {
    id: "css-01", title: "🎯 置中方塊", concept: "flex 置中", chapterHref: "/chapters",
    intro: "把藍色方塊移到正中央的虛線目標。試試在 .stage 上用 flexbox。",
    hint: ".stage {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}",
    html: HTML,
    baseCss: STAGE + `\n#goal{top:70px;left:120px}`,
    starter: "/* 讓藍色方塊置中對到虛線框 */\n.stage {\n  \n}\n",
    parLines: 4, xp: 16, z: 8,
  },
  {
    id: "css-02", title: "🎯 靠右下角", concept: "absolute 定位", chapterHref: "/chapters",
    intro: "把方塊移到右下角的目標框。用絕對定位 + right / bottom。",
    hint: "#box {\n  position: absolute;\n  right: 12px;\n  bottom: 12px;\n}",
    html: HTML,
    baseCss: STAGE + `\n#goal{right:12px;bottom:12px}`,
    starter: "/* 把方塊定位到右下角虛線框 */\n#box {\n  \n}\n",
    parLines: 4, xp: 18, z: 9,
  },
  {
    id: "css-03", title: "🎯 頂端置中", concept: "定位組合", chapterHref: "/chapters",
    intro: "把方塊移到「上方置中」的目標。想想水平置中 + 貼齊頂端怎麼組。",
    hint: "#box {\n  position: absolute;\n  top: 12px;\n  left: 50%;\n  transform: translateX(-50%);\n}",
    html: HTML,
    baseCss: STAGE + `\n#goal{top:12px;left:120px}`,
    starter: "/* 把方塊移到上方置中的虛線框 */\n#box {\n  \n}\n",
    parLines: 5, xp: 20, z: 10,
  },
];

export function getCssLevel(id: string): CssLevel | null {
  return CSS_LEVELS.find((l) => l.id === id) ?? null;
}
