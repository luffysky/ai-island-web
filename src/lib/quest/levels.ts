/**
 * Code Quest 關卡定義（玩遊戲學寫程式）。
 * 每關對應一個程式觀念（也標了相關章節）——寫 Python 控制機器人走到 🎯。
 * grid：'.'=空地 '#'=牆 'S'=起點 'G'=終點 '*'=寶石。dir 0=上 1=右 2=下 3=左。
 */
export type QuestLevel = {
  id: string;
  title: string;
  concept: string;        // 對應觀念
  chapterHref?: string;   // 相關章節（複習用）
  intro: string;
  hint: string;
  grid: string[];
  startDir: number;
  starter: string;
  parLines: number;       // 用 <= parLines 行拿 3 星
  xp: number;
  z: number;
};

export const QUEST_LEVELS: QuestLevel[] = [
  {
    id: "01-move", title: "第 1 關 · 前進", concept: "呼叫函式 / 順序執行", chapterHref: "/chapters",
    intro: "機器人 🤖 要走到旗子 🎯。用 move() 讓它往前一步。這關要走 3 步。",
    hint: "一步一個 move()：三行 move()，或想想有沒有更短的寫法。",
    grid: ["S..G"], startDir: 1,
    starter: "move()\n", parLines: 3, xp: 10, z: 5,
  },
  {
    id: "02-for", title: "第 2 關 · 迴圈", concept: "for 迴圈", chapterHref: "/chapters",
    intro: "要走 6 步才到旗子。一直複製 move() 太累了——用 for 迴圈叫它重複。",
    hint: "for i in range(6):\n    move()   ← 記得縮排",
    grid: ["S.....G"], startDir: 1,
    starter: "for i in range(6):\n    move()\n", parLines: 2, xp: 12, z: 6,
  },
  {
    id: "03-turn", title: "第 3 關 · 轉彎", concept: "順序 + 轉向", chapterHref: "/chapters",
    intro: "路是 L 型的：先往右走到底，轉彎面向下，再往下走到旗子。用 turn_right() 轉向。",
    hint: "move() 兩步到底 → turn_right()（面向下）→ 再 move() 兩步。",
    grid: ["S..", "##.", "..G"], startDir: 1,
    starter: "move()\nmove()\n# 轉彎後繼續…\n", parLines: 6, xp: 15, z: 8,
  },
  {
    id: "04-while", title: "第 4 關 · 一直走到底", concept: "while 迴圈 + 條件", chapterHref: "/chapters",
    intro: "不知道要走幾步？用 while 讓它「還沒到旗子就一直走」。at_goal() 會告訴你到了沒。",
    hint: "while not at_goal():\n    move()",
    grid: ["S.........G"], startDir: 1,
    starter: "while not at_goal():\n    move()\n", parLines: 2, xp: 18, z: 10,
  },
  {
    id: "05-if-maze", title: "第 5 關 · 遇牆轉彎", concept: "if 判斷 + while", chapterHref: "/chapters",
    intro: "不知道何時該轉彎？用 wall_ahead() 感應前方：if 前面有牆就 turn_right()、否則 move()，一直到旗子。",
    hint: "while not at_goal():\n    if wall_ahead():\n        turn_right()\n    else:\n        move()",
    grid: ["S....", "####G"], startDir: 1,
    starter: "while not at_goal():\n    if wall_ahead():\n        turn_right()\n    else:\n        move()\n", parLines: 6, xp: 22, z: 12,
  },
  {
    id: "06-gems", title: "第 6 關 · 收集寶石", concept: "for + list（收集）", chapterHref: "/chapters",
    intro: "沿路有 3 顆寶石 💎，全部收集再到旗子。走過寶石就會自動撿起。",
    hint: "一路 move() 走到底就會撿到所有寶石；用 for 或 while 都行。",
    grid: ["S.*.*.*.G"], startDir: 1,
    starter: "for i in range(8):\n    move()\n", parLines: 3, xp: 25, z: 15,
  },
  {
    id: "07-def", title: "第 7 關 · 自訂招式", concept: "def 定義函式", chapterHref: "/chapters",
    intro: "要走一個「右一步、上一步」的樓梯重複三次。與其一直複製，不如自己定義一招 def，再重複用。",
    hint: "def zigzag():\n    move()          # 往右\n    turn_left()     # 面向上\n    move()          # 往上\n    turn_right()    # 再面向右\n\nfor i in range(3):\n    zigzag()",
    grid: ["...G", "....", "....", "S..."], startDir: 1,
    starter: "def zigzag():\n    move()\n    turn_left()\n    move()\n    turn_right()\n\nfor i in range(3):\n    zigzag()\n", parLines: 8, xp: 28, z: 16,
  },
  {
    id: "08-while2", title: "第 8 關 · 邊走邊撿", concept: "while + 收集", chapterHref: "/chapters",
    intro: "一條長路上有寶石 💎。用 while 一直走到旗子，順手把寶石都撿了。",
    hint: "while not at_goal():\n    move()",
    grid: ["S..*..*..G"], startDir: 1,
    starter: "while not at_goal():\n    move()\n", parLines: 2, xp: 26, z: 15,
  },
  {
    id: "09-maze3", title: "第 9 關 · 大迷宮", concept: "while + if（綜合）", chapterHref: "/chapters",
    intro: "更長的迷宮！一樣用『遇牆轉彎、否則前進』的招式，一路走到旗子。",
    hint: "while not at_goal():\n    if wall_ahead():\n        turn_right()\n    else:\n        move()",
    grid: ["S....", "####.", "....G"], startDir: 1,
    starter: "while not at_goal():\n    if wall_ahead():\n        turn_right()\n    else:\n        move()\n", parLines: 6, xp: 30, z: 18,
  },
];

export function getLevel(id: string) {
  return QUEST_LEVELS.find((l) => l.id === id) ?? null;
}
