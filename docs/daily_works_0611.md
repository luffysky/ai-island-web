# Daily Works — 2026-06-11

董事長林董（Luffy Lin）。雪鑰值班。
主題：**ch26 圖改檔名破快取 → 綠寶記住所選模型 → 記住上次看到的段落可一鍵 / 透過綠寶跳轉 → 綠寶/Admin 浮層永遠蓋在章節大綱上 → 桌機大綱展開不鎖內容捲動**。

---

## 🖼️ Ch26 圖快取吃到舊圖 → 改檔名破快取
- 瀏覽器 / CDN 一直吃到舊版圖。檔名統一加 `_v1` 後綴強制重抓（git 認出是 100% 純改名、內容不變）。
- `ch26.json` 內 9 張 dark 引用同步改 `_v1`（light 由 LessonImage 自動推導，不用改）。

## 🤖 綠寶 — 記住所選 AI 模型（task 2）
- 症狀：選過模型，重新整理 / 下次再進網站又變回「Auto（依難度自動選）」。
- 修：選的模型（含 Auto）寫進 `localStorage`（`ai_tutor_model`），重整 / 回訪都還在。
- 防呆：models 載入後驗證，若後台把該模型停用了 → 自動退回 Auto，不卡死。

## 📍 記住「上次看到的段落」+ 跳轉（task 3）
長章節找上次讀到哪很花時間。新增整套「續讀」：
- `src/lib/reading-position.ts`：localStorage 記每章一筆 + 全站最後一筆（client-only、不碰 DB）。
- `ChapterView` 用 **IntersectionObserver** 追視窗最上方的 lesson、停 1.2s 才寫（不狂寫）。
- 重開章節頂部出現「**繼續上次閱讀 · LESSON X.X**」橫幅、一鍵平滑捲回並高亮 2 秒（在第一節就不打擾、帶 hash 跳轉時不顯示）。
- 綠寶空狀態加「**📍 跳到我上次看的段落**」：同章直接捲、跨章導去 `/chapters/<id>#lesson-<id>`（ChapterView 既有 hash 跳轉接手）。
- LessonCard 補 `data-lesson-id` 給 observer 用。

## 🟢 綠寶 / Admin 浮層 — 永遠蓋在章節大綱上（task 4）
- 一開始：綠寶 z-30 / Admin z-40 被左側大綱（aside z-50）蓋住 → 先把兩者拉到 **z-55**。
- 林董補充：「**就算大綱展開也要蓋在上面**」。但大綱展開原本註冊成一般 overlay → 連帶把綠寶/Admin 一起隱藏。
- 修 overlay-stack：新增 `navCount`（導覽抽屜專用）+ `useModalOverlayCount()`（= 非導覽 overlay 數）。
  - 綠寶 / Admin 改用它：**只有真 modal / dropdown / 聊天面板開才隱藏，章節大綱展開不算** → 配合 z-55 直接浮在大綱上。
  - Pet / Todo 維持原樣（大綱展開仍讓位）。

## 📜 桌機大綱展開 → 內容頁滑不動（修）
- 林董：「為什麼大綱展開 內容頁面就沒辦法動」。
- 主因：SideNav 一律以 `lockScroll=true` 註冊 overlay → 連**桌機常駐側欄**展開都鎖了 body scroll。
- 桌機大綱是「常駐側欄」、展開只把內容往右推、頁面本該照滑；手機才是「抽屜 modal」要鎖背景。
- 修：用 `matchMedia(min-width:1024px)` 判斷——**只有手機抽屜開啟才註冊鎖捲動 + Pet/Todo 退位；桌機展開不註冊**（不鎖、綠寶/Admin 仍 z-55 蓋在上面）。

---

# 📋 待辦 / 提醒（延續）

## 要林董手動處理
- **Gemini 儲值**：ai.studio → Billing → 加值 prepaid credits（不然持續 429）。
- **Supabase 慢回應**：模型清單重試擋大部分「只剩 Auto」，根因仍是實例回應慢。

## 可選 / 實機驗收
- 桌機展開「章節大綱」滑內容應可正常捲；綠寶/Admin 不論收合或展開都壓在最上層可點；碰到真彈窗才讓位。
- 選個模型重整看是否記住；章節中段離開再回來看「繼續上次閱讀」橫幅 + 綠寶「📍跳到上次段落」。

---

## 📦 本日 commit
`13e75fe` ch26 圖改檔名 _v1 破快取 + json 路徑 ·
`86cbcf7` 記住所選模型 + 記住上次段落可跳轉 + 綠寶/Admin z-55 ·
`547f133` 大綱展開時綠寶/Admin 仍蓋在上面（navCount） ·
`e80549e` 桌機大綱展開不鎖捲動、內容可滑。
