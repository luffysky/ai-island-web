# CONTENT-01 章末 20 題綜合測驗

## 0. Metadata

- **版本**：v1.0
- **狀態**：規劃中
- **預估**：UI ~6h、單章內容 1.5h（70 章 = ~105h、需 AI 出題助手分批）
- **動機**：使用者明確要求「章節最後加上一道 20 題的題目測驗、20 題一題答對 +5 經驗、整章內容答對就是 100、閱讀的 lesson 也可以領取經驗」

## 1. 與現有系統的關係

現有 `chapter.boss` + `chapter.quiz` 已支援 BossBattle 模式（通常 10 題）。**章末 20 題**是「比 boss 更輕量、可重複嘗試、給每章一次集中複習」的測驗。兩者並存：

| 功能 | 用途 | 入口 |
|---|---|---|
| BossBattle | 章末 boss 戰、5 hearts 限血、答錯扣 heart | 章節下方 |
| 章末 20 題（新） | 純測驗回顧、隨時可重做、答對 +5 XP 上限 100 | lesson 列表底部 + 章節摘要區 |

## 2. JSON 結構（接到 chapter JSON 內）

```jsonc
{
  "id": 1,
  "title": "...",
  "lessons": [ /* ... */ ],
  "endQuiz": {
    "title": "Ch01 全章測驗",
    "description": "20 題快速回顧、每題 +5 XP、滿分 +100",
    "xpPerCorrect": 5,
    "passingScore": 16,        // 16 題以上發完整 100，不到只發實際對的數量
    "questions": [
      {
        "id": "ch01-q1",
        "type": "single",        // single | multiple | true_false
        "question": "下列哪個標籤代表 HTML5？",
        "options": [
          "<!DOCTYPE html5>",
          "<!DOCTYPE html>",
          "<html5>",
          "<doctype html>"
        ],
        "answer": 1,               // index for single, [0,2] for multiple, true/false
        "hint": "現代瀏覽器只需要短的宣告",
        "explanation": "HTML5 用最短的 <!DOCTYPE html>、不需版本號"
      }
      // ... 共 20 題
    ]
  }
}
```

## 3. UI 規格

### 入口位置
- 章節頁底部、`BossBattle` 之前
- 區塊標題：「📝 章末綜合測驗」+ 「最高 +100 XP、可重複嘗試（重做不再發 XP）」
- 已通過者顯示：✅ 已通過、`16/20` 答對紀錄

### 答題流程
1. 點「開始測驗」→ 滿版 modal（或專用 sub-route）
2. 一次顯示 1 題、底部進度條（3/20）+「上一題 / 下一題」
3. 答錯不擋、不限時、最後一題按「交卷」
4. 結算頁：
   - 大字 `對 16 題 / 共 20 題`
   - 紅綠列表：哪題對、哪題錯（含解析）
   - 領取 XP：第一次通過依答對數 ×5 發放（上限 100）、之後重做不再發

### XP 重複領取防呆
- `xp_events` 寫入時 `meta.source = 'chapter_end_quiz'`、`meta.chapter_id = N`
- 完成前先查：該 user 該 chapter 是否已有此 source 紀錄、有則 0 XP

## 4. 資料儲存

複用既有：
- `chapters JSON.endQuiz`（內容）
- `quiz_attempts` 表記錄每次嘗試（user_id / chapter_id / quiz_type='end_quiz' / score / total / xp_awarded / created_at）
- `xp_events` 領 XP 紀錄

無新 migration。

## 5. 元件拆分

```text
src/components/chapter/
├── EndQuizSection.tsx         # 章節頁底部觸發按鈕 + 已通過狀態
├── EndQuizPlayer.tsx          # 滿版作答 UI（題目導覽、進度條、交卷）
└── EndQuizResult.tsx          # 結算 + XP 領取
```

## 6. 內容生成計畫（70 章 × 20 題）

不可能單次手寫 1400 題。提供兩條路：

### 方案 A：admin 出題助手
- 新增 `/admin/chapters/<id>/quiz-builder`
- 後端把該章所有 lesson 內容塞給綠寶 + 系統 prompt「依以下內容出 20 題綜合測驗、單選為主、難度由淺入深、附 hint 與解析」
- AI 草稿 → admin 校稿 → 存回 JSON
- 工時：~4h（介面）+ 每章人工校稿 ~10-15 分鐘

### 方案 B：本對話直接示範 ch01
我可以現在示範一章（ch01：HTML 開頭基礎）。但其餘 69 章需後續批次。

**建議：先做方案 A 的 admin tool、然後分章節漸進補完**。

## 7. Lesson 完成領 XP（你提的「閱讀的 lesson 也可以領取經驗」）

現有 LessonCard 已有「✓ 標記完成 (+XP)」按鈕、auth race 已修。**這部分已能用**，只是 UI 入口可加強：

- Lesson 末加大顯示「點此標記完成 +N XP」CTA
- 視覺強調未完成 vs 已完成（鎖頭 → 勾勾）
