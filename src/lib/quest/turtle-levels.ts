/**
 * 🐢 Turtle 幾何：forward/right/left 畫線，畫出目標形狀。
 * win 判定：把你畫的線段跟「參考解」的線段比對（同形狀＝同邊集合）。
 * 目標形狀由 solution（參考解）在 Pyodide 跑一次算出來（也拿來畫淡淡的目標輪廓）。
 */
export type TurtleLevel = {
  id: string; title: string; concept: string; chapterHref?: string;
  intro: string; hint: string;
  start: { x: number; y: number; heading: number }; // heading 度數，0=朝上
  canvas: { w: number; h: number };
  solution: string;  // 參考解（算目標 + 畫輪廓；不給玩家看）
  starter: string; parLines: number; xp: number; z: number;
};

export const TURTLE_LEVELS: TurtleLevel[] = [
  {
    id: "turtle-01", title: "🐢 正方形", concept: "for 迴圈 + 角度", chapterHref: "/chapters",
    intro: "畫一個正方形。forward(n) 前進、right(度) 右轉。正方形的四個角各轉 90 度。",
    hint: "for i in range(4):\n    forward(80)\n    right(90)",
    start: { x: 80, y: 160, heading: 0 }, canvas: { w: 240, h: 240 },
    solution: "for i in range(4):\n    forward(80)\n    right(90)\n",
    starter: "for i in range(4):\n    forward(80)\n    # 轉 90 度\n", parLines: 3, xp: 14, z: 8,
  },
  {
    id: "turtle-02", title: "🐢 三角形", concept: "角度 / 外角", chapterHref: "/chapters",
    intro: "畫正三角形。三角形每個外角是 120 度（不是 60 喔！）。",
    hint: "for i in range(3):\n    forward(100)\n    right(120)",
    start: { x: 70, y: 175, heading: 0 }, canvas: { w: 240, h: 240 },
    solution: "for i in range(3):\n    forward(100)\n    right(120)\n",
    starter: "for i in range(3):\n    forward(100)\n    right(?)\n", parLines: 3, xp: 16, z: 9,
  },
  {
    id: "turtle-03", title: "🐢 五角星", concept: "迴圈 + 角度（進階）", chapterHref: "/chapters",
    intro: "畫一個五角星 ⭐。重複 5 次：前進、右轉 144 度。試試看為什麼是 144！",
    hint: "for i in range(5):\n    forward(90)\n    right(144)",
    start: { x: 75, y: 150, heading: 0 }, canvas: { w: 240, h: 240 },
    solution: "for i in range(5):\n    forward(90)\n    right(144)\n",
    starter: "for i in range(5):\n    forward(90)\n    right(144)\n", parLines: 3, xp: 20, z: 12,
  },
];

export function getTurtleLevel(id: string) { return TURTLE_LEVELS.find((l) => l.id === id) ?? null; }
