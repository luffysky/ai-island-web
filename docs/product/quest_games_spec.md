# 程式副本島 — 新遊戲類型 build brief（給下一輪 context 直接開工）

已完成基礎（別重做）：
- `/quest`（`src/app/quest/page.tsx`）：關卡地圖，讀 `quest_completions` 顯示星數 + 解鎖。
- `/quest/[id]`（`page.tsx` + `QuestPlay.tsx`）：**迷宮機器人**遊戲（已上線、PixiJS）。
- `src/lib/quest/levels.ts`：迷宮關卡資料（9 關）。
- `src/lib/quest/sprites.ts`：原創 CC0 像素 sprite（robot/gem/flag）+ `spriteCanvas()`。
- `POST /api/quest/complete`：`{ levelId, stars }` → 記 `quest_completions`、**首次通關發 XP/Z 幣**（`increment_profile_xp` + `award_z_coin`）。**已通用，新遊戲直接沿用、levelId 唯一即可。**
- 音效：`QuestPlay.tsx` 的 `sfx()`（WebAudio 合成，可抽成共用）。
- PixiJS 8.16 已裝（dynamic import、code-split）。

## 共用架構（4 種遊戲都照這個）
1. **Pyodide 跑 Python**：`usePyodide()` 的 `run(code)`（見 `src/hooks/usePyodide.ts`）。
2. **前綴 preamble** 注入指令 + `settrace` 防無限迴圈（抄 `QuestPlay.buildPython`）。
3. 使用者 code 跑完 → `print("__STATE__"+json.dumps(...))` → JS 解析。
4. **PixiJS 畫**最終/動畫狀態；**比對最終狀態 == 目標** → win → 星等（行數 ≤ par）→ `POST /api/quest/complete`。
5. 每種遊戲：一支 `*-levels.ts` + 一支 `XxxPlay.tsx` + 一個 route；`/quest` 首頁分區列出。

建議：把 `sfx()`、`spriteCanvas`、Pyodide preamble helper 抽到 `src/lib/quest/engine.ts` 共用，避免每個遊戲複製。

---

## 遊戲 1 🎨 畫圖機器人（Paint）
- **學**：迴圈 + 座標。
- **指令**：`move() / turn_left() / turn_right() / paint()`（把目前格子上色）。
- **關卡**：grid 用 `T` 標「該上色的目標格」；win = 上色的格子集合 == 目標集合。
- **畫**：目標格用虛線外框，已上色格填色，機器人 sprite 沿路走。
- 例：畫一條線、一個方框、棋盤格 → 逼出 `for` / 巢狀 `for`。

## 遊戲 2 🐢 Turtle 幾何（連續畫布，非格子）
- **學**：迴圈 + 角度。
- **指令**：`forward(n) / right(deg) / left(deg) / pen_up() / pen_down()`。記錄線段 `[{x1,y1,x2,y2}]`。
- **win**：畫出的線段涵蓋目標形狀（比對頂點/邊，允許容差）。目標：正方形、三角、星形、螺旋。
- **畫**：PixiJS `Graphics` 畫線 + 動畫逐段畫出。座標用浮點（非格子）。

## 遊戲 3 🔢 數字關卡（純邏輯，無移動）
- **學**：變數 + 運算 + 條件。
- **機制**：給題目（如「算出 1~100 的和」「找出密碼」），使用者寫 code `print(答案)` 或 `answer = ...`；比對 stdout / 變數。
- **畫**：不用 PixiJS；就一個終端輸出 + 過關動畫。最輕。
- 例：開鎖（算出數字）、FizzBuzz、質數判斷。

## 遊戲 4 🐛 抓蟲關（Debug）
- **學**：讀 code + 除錯（超貼合「Debug 老爹」人設）。
- **機制**：給一段**壞掉的** Python（含 bug），使用者改對讓它通過幾個測試（`assert`）。win = 所有 assert 過 + 沒 error。
- **畫**：不用 PixiJS；顯示測試通過/失敗清單。
- 綠寶提示：指出「大概第幾行、什麼類型的錯」。

---

## 收尾
- `/quest` 首頁改成分區：「🤖 迷宮」「🎨 畫圖」「🐢 幾何」「🔢 數字」「🐛 抓蟲」。
- 每種 3~6 關，關卡 JSON 化後可 AI 批量生成。
- 驗證：每種遊戲寫個 JS 模擬 verifier 跑正解（照 `_verify_quest` 模式），確認可通關；build 綠；DB 沿用 `quest_completions`（levelId 前綴分遊戲，如 `paint-01`）。
- **殘留風險提醒**：WebGL + Pyodide 這環境測不到 → 每種做完請開瀏覽器點一關確認會跑。
