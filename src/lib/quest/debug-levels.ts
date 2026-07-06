/** 🐛 抓蟲關：給一段壞掉的 code，改對讓它通過所有測試。 */
export type DebugLevel = {
  id: string; title: string; concept: string; chapterHref?: string;
  intro: string; hint: string;
  buggy: string;   // 起始（含 bug）
  tests: string;   // 測試（assert，接在使用者 code 之後跑）
  parLines: number; xp: number; z: number;
};

export const DEBUG_LEVELS: DebugLevel[] = [
  {
    id: "bug-01", title: "🐛 加法壞了", concept: "運算子 / 讀 code", chapterHref: "/chapters",
    intro: "這個 add 應該回傳兩數相加，但結果不對。找出那個字改掉，讓測試通過。",
    hint: "看 return 那行——它用了減號 - ，應該是加號 + 。",
    buggy: "def add(a, b):\n    return a - b\n",
    tests: "assert add(2, 3) == 5\nassert add(10, 5) == 15",
    parLines: 2, xp: 12, z: 6,
  },
  {
    id: "bug-02", title: "🐛 少加了一個", concept: "range 邊界 / off-by-one", chapterHref: "/chapters",
    intro: "total(n) 要算 1+2+...+n，但總是少算最後一個。修好它。",
    hint: "range(1, n) 只到 n-1。要含 n 得寫 range(1, n + 1)。",
    buggy: "def total(n):\n    s = 0\n    for i in range(1, n):\n        s += i\n    return s\n",
    tests: "assert total(5) == 15\nassert total(3) == 6",
    parLines: 5, xp: 15, z: 8,
  },
  {
    id: "bug-03", title: "🐛 找最大值", concept: "初始值 / 條件", chapterHref: "/chapters",
    intro: "biggest 要找出清單裡最大的數，但遇到「全是負數」就出錯。想想 big 的初始值哪裡有問題。",
    hint: "big = 0 假設了「一定有比 0 大的數」。改成 big = lst[0]（先假設第一個最大）就對了。",
    buggy: "def biggest(lst):\n    big = 0\n    for x in lst:\n        if x > big:\n            big = x\n    return big\n",
    tests: "assert biggest([3, 9, 2]) == 9\nassert biggest([-3, -1, -7]) == -1",
    parLines: 6, xp: 18, z: 10,
  },
];

export function getDebugLevel(id: string) { return DEBUG_LEVELS.find((l) => l.id === id) ?? null; }
