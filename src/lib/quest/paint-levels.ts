/** 🎨 畫圖機器人：move/turn/paint 上色，拼出目標圖案。grid 'T'=要上色的目標格。 */
export type PaintLevel = {
  id: string; title: string; concept: string; chapterHref?: string;
  intro: string; hint: string;
  grid: string[];   // '.'空 '#'牆 'S'起點 'T'目標格（要上色）
  startDir: number; starter: string; parLines: number; xp: number; z: number;
};

export const PAINT_LEVELS: PaintLevel[] = [
  {
    id: "paint-01", title: "🎨 畫一條線", concept: "for 迴圈 + paint()", chapterHref: "/chapters",
    intro: "把整條路都上色（4 格）。走一步、塗一格。paint() 會把目前站的格子塗上色。",
    hint: "for i in range(4):\n    move()\n    paint()",
    grid: ["STTTT"], startDir: 1,
    starter: "for i in range(4):\n    move()\n    paint()\n", parLines: 3, xp: 12, z: 6,
  },
  {
    id: "paint-02", title: "🎨 轉角 L", concept: "順序 + 轉向 + paint", chapterHref: "/chapters",
    intro: "把 L 形的目標格都上色：先往右塗兩格，轉彎往下再塗兩格。",
    hint: "move(); paint()  重複兩次 → turn_right() → 再 move(); paint() 兩次",
    grid: ["STT", "..T", "..T"], startDir: 1,
    starter: "move()\npaint()\nmove()\npaint()\nturn_right()\nmove()\npaint()\nmove()\npaint()\n", parLines: 12, xp: 15, z: 8,
  },
  {
    id: "paint-03", title: "🎨 掃地機器人", concept: "巢狀 for + 轉向", chapterHref: "/chapters",
    intro: "把兩排地板都塗滿（像掃地一樣來回走）。上排 3 格 + 下排 4 格。",
    hint: "for i in range(3):\n    move(); paint()\nturn_right()\nmove(); paint()\nturn_right()\nfor i in range(3):\n    move(); paint()",
    grid: ["STTT", "TTTT"], startDir: 1,
    starter: "for i in range(3):\n    move()\n    paint()\nturn_right()\nmove()\npaint()\nturn_right()\nfor i in range(3):\n    move()\n    paint()\n", parLines: 8, xp: 20, z: 12,
  },
];

export function getPaintLevel(id: string) { return PAINT_LEVELS.find((l) => l.id === id) ?? null; }
