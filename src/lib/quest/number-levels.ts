/** 🔢 數字關卡：純邏輯，寫 code 算出答案 print()，比對 stdout。 */
export type NumberLevel = {
  id: string; title: string; concept: string; chapterHref?: string;
  intro: string; hint: string;
  expect: string;   // 預期 stdout（正規化後比對）
  starter: string; parLines: number; xp: number; z: number;
};

export const NUMBER_LEVELS: NumberLevel[] = [
  {
    id: "num-01", title: "🔢 開鎖 · 加總", concept: "for 迴圈 + 變數", chapterHref: "/chapters",
    intro: "密碼是「1 一路加到 100」的總和。算出來、用 print() 印出密碼。",
    hint: "total = 0\nfor i in range(1, 101):\n    total += i\nprint(total)",
    expect: "5050",
    starter: "# 算 1 + 2 + ... + 100，然後 print 出來\n", parLines: 4, xp: 12, z: 6,
  },
  {
    id: "num-02", title: "🔢 FizzBuzz", concept: "if / elif + 餘數", chapterHref: "/chapters",
    intro: "印 1 到 15：3 的倍數印 Fizz、5 的倍數印 Buzz、同時是 3 和 5 的倍數印 FizzBuzz、其他印數字本身。",
    hint: "for i in range(1, 16):\n    if i % 15 == 0: print('FizzBuzz')\n    elif i % 3 == 0: print('Fizz')\n    elif i % 5 == 0: print('Buzz')\n    else: print(i)",
    expect: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz",
    starter: "for i in range(1, 16):\n    pass\n", parLines: 7, xp: 16, z: 8,
  },
  {
    id: "num-03", title: "🔢 找質數", concept: "巢狀迴圈 + 條件", chapterHref: "/chapters",
    intro: "印出 2 到 20 之間所有的質數（每行一個，由小到大）。質數＝只能被 1 和自己整除。",
    hint: "for n in range(2, 21):\n    is_prime = True\n    for d in range(2, n):\n        if n % d == 0:\n            is_prime = False\n    if is_prime:\n        print(n)",
    expect: "2\n3\n5\n7\n11\n13\n17\n19",
    starter: "for n in range(2, 21):\n    # 判斷 n 是不是質數，是就 print(n)\n    pass\n", parLines: 8, xp: 20, z: 10,
  },
];

export function getNumberLevel(id: string) { return NUMBER_LEVELS.find((l) => l.id === id) ?? null; }
