/**
 * 📊 排序視覺化關卡：玩家寫 Python 排序，過程用 show(nums) 印出每一步 → 前端把陣列畫成長條、逐步動畫。
 * 判定：抓 stdout 裡的 __STEP__ 狀態序列，最後一個要等於期望排序結果（升冪 / 降冪）。
 */
export type SortLevel = {
  id: string; title: string; concept: string; chapterHref?: string;
  intro: string; hint: string;
  input: number[];        // 起始陣列（會注入成 Python 變數 nums）
  order: "asc" | "desc";  // 期望排序方向
  starter: string; parLines: number; xp: number; z: number;
};

export const SORT_LEVELS: SortLevel[] = [
  {
    id: "sort-01", title: "📊 泡泡排序 · 由小到大", concept: "巢狀迴圈 + 交換", chapterHref: "/chapters",
    input: [5, 3, 8, 1, 4], order: "asc",
    intro: "把陣列從小排到大。每比較一輪就 show(nums) 一次，看長條慢慢歸位。",
    hint: "n = len(nums)\nfor i in range(n):\n    for j in range(n - 1 - i):\n        if nums[j] > nums[j+1]:\n            nums[j], nums[j+1] = nums[j+1], nums[j]\n    show(nums)   # 每跑完一輪就秀一次",
    starter: "# nums 已經幫你準備好了：泡泡排序，由小到大\n# 每跑完一輪外圈就呼叫 show(nums) 秀出目前狀態\nn = len(nums)\nfor i in range(n):\n    # 內圈兩兩比較、必要時交換\n    pass\n    show(nums)\n",
    parLines: 7, xp: 18, z: 9,
  },
  {
    id: "sort-02", title: "📊 選擇排序 · 找最小放前面", concept: "選擇排序", chapterHref: "/chapters",
    input: [64, 25, 12, 22, 11], order: "asc",
    intro: "每一輪從剩下的找最小，換到最前面。每換一次 show(nums) 看它歸位。",
    hint: "n = len(nums)\nfor i in range(n):\n    m = i\n    for j in range(i+1, n):\n        if nums[j] < nums[m]:\n            m = j\n    nums[i], nums[m] = nums[m], nums[i]\n    show(nums)",
    starter: "# 選擇排序：每輪找出最小值、換到第 i 位\nn = len(nums)\nfor i in range(n):\n    # 找 i..n 之間最小的索引 m，再跟 i 交換\n    pass\n    show(nums)\n",
    parLines: 8, xp: 20, z: 10,
  },
  {
    id: "sort-03", title: "📊 由大到小", concept: "排序方向", chapterHref: "/chapters",
    input: [3, 7, 2, 9, 4, 1], order: "desc",
    intro: "這次要「由大到小」排。想想比較的方向要怎麼改。每輪 show(nums)。",
    hint: "把比較條件從 > 改成 < 即可（或先升冪排完再 reverse）。\nn = len(nums)\nfor i in range(n):\n    for j in range(n-1-i):\n        if nums[j] < nums[j+1]:\n            nums[j], nums[j+1] = nums[j+1], nums[j]\n    show(nums)",
    starter: "# 由大到小排序，每輪 show(nums)\nn = len(nums)\nfor i in range(n):\n    pass\n    show(nums)\n",
    parLines: 7, xp: 22, z: 11,
  },
];

export function getSortLevel(id: string): SortLevel | null {
  return SORT_LEVELS.find((l) => l.id === id) ?? null;
}
