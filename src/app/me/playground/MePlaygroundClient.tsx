"use client";

import { useState } from "react";
import { PlaygroundCard } from "@/components/chapter/PlaygroundCard";
import { Sparkles } from "lucide-react";

type Example = { label: string; language: string; code: string };

const EXAMPLES: Example[] = [
  {
    label: "🐍 Python",
    language: "python",
    code: `# Python 直接寫直接跑
names = ["Alice", "Bob", "招財"]
for i, n in enumerate(names, 1):
    print(f"{i}. 嗨 {n}！")

total = sum(x * x for x in range(1, 6))
print("1²+...+5² =", total)
`,
  },
  {
    label: "🟨 JavaScript",
    language: "javascript",
    code: `// 改改看、按執行看 console
const nums = [1, 2, 3, 4, 5];
const doubled = nums.map((n) => n * 2);
console.log("doubled:", doubled);
console.log("sum:", nums.reduce((a, b) => a + b, 0));
`,
  },
  {
    label: "🌐 HTML",
    language: "html",
    code: `<!DOCTYPE html>
<html lang="zh-Hant">
<head><meta charset="utf-8"><title>我的頁</title></head>
<body style="font-family:sans-serif;padding:24px">
  <h1>Hello AI 島 🏝️</h1>
  <p>改改文字、按執行看右邊預覽。</p>
  <button onclick="alert('你點了！')">點我</button>
</body>
</html>`,
  },
  {
    label: "🗄️ SQL",
    language: "sql",
    code: `-- 建表 + 查詢
CREATE TABLE users (id INTEGER, name TEXT, age INTEGER);
INSERT INTO users VALUES (1,'Alice',30),(2,'Bob',17),(3,'招財',3);

SELECT name, age FROM users
WHERE age >= 18
ORDER BY age DESC;`,
  },
  {
    label: "🐹 Go",
    language: "go",
    code: `package main

import "fmt"

func main() {
	for i := 1; i <= 5; i++ {
		fmt.Printf("第 %d 行\\n", i)
	}
}`,
  },
];

export function MePlaygroundClient() {
  const [ex, setEx] = useState<Example>(EXAMPLES[0]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">🧪 程式碼遊樂場</h1>
        <p className="text-sm text-fg-muted">
          支援 Python / JS / HTML / SQL / Go / Rust / Java… 邊寫邊跑。換語言用編輯器右上角下拉選。
        </p>
      </div>

      {/* 範例 */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-fg-muted">載入範例：</span>
        {EXAMPLES.map((e) => (
          <button
            key={e.label}
            onClick={() => setEx(e)}
            className={`px-3 py-1 rounded-full text-sm transition ${
              ex.label === e.label ? "bg-accent text-black font-semibold" : "bg-bg-elevated text-fg-muted hover:text-fg"
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>

      {/* 編輯器（換範例時 remount 載新 code） */}
      <PlaygroundCard
        key={ex.label}
        playground={{ key: `me-playground-${ex.label}`, language: ex.language, initialCode: ex.code, title: `${ex.label} 範例` } as any}
        lessonId="me-playground"
        isLoggedIn
      />

      {/* 問綠寶 */}
      <div className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-5">
        <div className="flex items-center gap-2 font-bold mb-1">
          <Sparkles size={18} className="text-purple-400" /> 卡住了？問綠寶
        </div>
        <p className="text-sm text-fg-muted">
          把你的 code 或錯誤訊息複製起來，點右下角 🟢 <b>綠寶 AI 導師</b>，貼給它問「這段為什麼錯 / 怎麼優化」。
          綠寶會看你的學習進度給建議、還能引用任何章節。
        </p>
      </div>
    </div>
  );
}
