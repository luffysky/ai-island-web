# UX 健檢報告

**版本**：v1.0
**日期**：2026-05-22
**Owner**：雪鑰
**狀態**：診斷完成、未動工
**指示**：董事長 2026-05-22「所有功能以優化 UX 體驗為最佳解」

---

## 0. 一句話結論

整體 UX 成熟度約 **50%**。架構面（AuthProvider、AI streaming、Suspense 邊界、寵物動畫）有亮點；但**全站系統性 anti-pattern 嚴重**：39 次 native `alert/confirm`、29 次 `<img>` 直用、21 次阻塞 `setLoading`、0 個 `loading.tsx`。改完 UX 跳躍可達 80%。

---

## 1. 已 OK（避免重做）

| 項目 | 評價 |
|---|---|
| **AuthProvider 設計** | 一個 listener / localStorage profile cache / 避免閃爍；`src/lib/auth-context.tsx:23-27` 註解明示原則 |
| **AI tutor SSE streaming** | `src/components/AITutorWidget.tsx:170-178` 用 `reader.getReader()` + 逐 chunk decode、有打字機感 |
| **章節 quiz player** | 剛 commit `dc497b7`、互動 / mood 反饋已有 |
| **寵物動畫** | mood-* CSS keyframe + milestone burst、視覺 60fps OK |
| **auth/callback Suspense 邊界** | 之前 build 失敗修過、現在不會炸 prerender |
| **後台 admin pattern** | createSupabaseServer + createSupabaseAdmin + audit_logs 三件組已標準化 |

---

## 2. 全站系統性 Anti-Pattern（最重要）

### 🔴 P1：39 次 `alert()` / `confirm()`

**證據**：跨 20 檔、含 admin / forum / blog / settings 核心頁
- `src/components/forum/ThreadReplies.tsx:71` — 回覆失敗用 `alert("回覆失敗：...")`、第 81 行刪除用 `confirm("刪除這則回覆？")`
- `src/app/admin/users/UserRow.tsx` — 6 次
- `src/app/admin/moderation/forum/Actions.tsx` — 4 次
- `src/components/SideNav.tsx` — 3 次
- `src/app/settings/SettingsForm.tsx` — 3 次

**問題**：
- native dialog 阻塞 thread、體驗突兀
- 無自訂樣式、不能 dismiss 在外部點擊
- 行動裝置上 modal 整個跳出來、感覺很「網頁感」
- 無撤銷機制（按錯就糟）

**修法**：
1. 建 `src/components/ui/Toast.tsx`（fixed bottom-right、framer-motion stack、4s auto dismiss）
2. 建 `src/components/ui/ConfirmDialog.tsx`（radix-ui dialog、有「撤銷 5 秒」選項）
3. 全站搜替 `alert()` → `toast.error()` / `toast.success()`、`confirm()` → `confirmDialog()`
4. 破壞性操作（刪除）改 toast + undo、不開 dialog（Gmail / Linear 風格）

**估時**：~6 hr（建元件 2 hr + 全站搜替 3 hr + test 1 hr）

### 🔴 P2：29 次 `<img>` 非 next/image

**證據**：跨 20 檔、含 TopNav / 部落格列表 / 章節 / forum thread 等熱路徑
- `src/components/layout/TopNav.tsx` — TopNav 圖示
- `src/app/blogs/[userSlug]/page.tsx` — 部落格列表 user avatar
- `src/components/forum/ThreadList.tsx` / `ThreadReplies.tsx`
- `src/components/chapter/LessonCard.tsx`
- `src/components/blog/CommentSection.tsx`

**問題**：
- 沒 lazy load → 首屏載入慢
- 沒 width/height → 累積 layout shift（CLS）
- 沒 blur placeholder → 載入閃白
- 沒 responsive sizes → 手機抓全尺寸圖
- 影響 Web Vitals 分數 + SEO

**修法**：全站搜替 `<img src="..." />` → `<Image src="..." width={...} height={...} alt="..." />`、avatar 加 `placeholder="blur"`

**估時**：~4 hr（搜替 + 量每張圖的 width/height）

### 🔴 P3：21 次阻塞 `setLoading/Sending/Saving(true)`

**證據**：跨 20 檔、含 BookmarkButton / NotePanel / PetChatPanel / 各表單
- `src/components/forum/ThreadReplies.tsx:60-78` — 完整阻塞模式：`setSending(true)` → `await fetch` → `setSending(false)` → `refresh()`（整列 refetch 不是 push 單筆）
- `src/components/chapter/BookmarkButton.tsx` — 收藏要等 server 才劃星
- `src/components/chapter/NotePanel.tsx` — 儲存筆記要等才顯示 ✓

**問題**：
- 使用者點擊到反饋 > 500ms（網路差時 > 2s）
- 按鈕 disable 期間使用者懷疑自己沒點到
- 失敗才回 alert、體驗很 90 年代

**修法**（optimistic pattern）：
```ts
// 點 send → 立刻 push 到列表 + 清空 input
const tempId = `temp-${Date.now()}`;
setReplies((r) => [...r, { id: tempId, content, pending: true }]);
setInput("");

fetch("/api/...", { method: "POST", body: ... })
  .then((r) => r.json())
  .then((real) => setReplies((r) => r.map(x => x.id === tempId ? real : x)))
  .catch(() => {
    setReplies((r) => r.filter(x => x.id !== tempId));
    toast.error("送出失敗、已退回");
  });
```

**估時**：每個檔 ~30 min × 約 15 個熱路徑檔 = ~8 hr

### 🔴 P4：0 個 `loading.tsx`

**證據**：`Glob src/app/**/loading.tsx` 回 0 個檔。

**問題**：
- Server component 載入時整頁白屏
- Next.js 15 streaming 完全沒用上
- 首頁 / chapters / blogs / me 都是冷起來感覺慢

**修法**：每個 layout 對應 route 加 `loading.tsx`（skeleton 結構配合該頁布局）
- `app/loading.tsx` — 全站 fallback
- `app/chapters/[id]/loading.tsx` — 章節骨架（hero + lessons skeleton）
- `app/blogs/loading.tsx` — 部落格列表骨架
- `app/me/loading.tsx` — 個人頁骨架
- `app/forum/loading.tsx` — 論壇 thread list 骨架

**估時**：每個 skeleton ~30 min × 8 個熱路徑 = ~4 hr

---

## 3. 個別痛點

### 🟡 P5：寵物 Pet.tsx 行動裝置 viewport 沒做

**證據**：`Grep @media|max-width|sm:|md: in Pet.tsx` 回 0 條。

**問題**：
- 寵物在小螢幕（< 768px）擋住閱讀內容
- 對話泡泡可能溢出 viewport
- 拖曳區計算 `clampToViewport` 沒考慮 mobile UI（鍵盤彈出等）

**修法**：
- `< 768px` 時寵物縮小 70% + 自動避開 viewport center（學員閱讀區）
- 對話泡泡 max-width 限螢幕寬 80%
- 加 `safe-area-inset-*` 避免被瀏海擋

**估時**：~2 hr

### 🟡 P6：auth callback 無 loading UI

**證據**：`src/app/auth/callback/CallbackHashHandler.tsx` 用 useEffect 處理、第 32 行 `window.location.replace(url)`，期間 user 看到空白頁。

**問題**：登入後跳轉黑/白屏 1-2 秒、感覺像 broken。

**修法**：page 加 `<div>正在帶您回首頁...</div>` + 進度條動畫；callback 即使失敗也有「回登入」連結。

**估時**：~1 hr

### 🟡 P7：論壇 reply submit 整 list refetch（不 push 單筆）

**證據**：`ThreadReplies.tsx:74` 完成後 `await refresh()` → 又一次完整 fetch 整列回覆。

**問題**：
- 雙倍 round-trip
- 大 thread（>50 回覆）每次發言都全 refetch
- 雜訊感（捲動位置可能丟、scroll restoration 失敗）

**修法**：併入 P3 的 optimistic pattern、不要呼叫 `refresh()`、直接 setReplies push 單筆。

**估時**：含在 P3 內。

### 🟡 P8：BookmarkButton / NotePanel 寵物事件 OK、但 UI 仍阻塞

**證據**：兩個檔我剛接手 commit `1a93d3b` 已加 dispatchEvent、但 button click 仍是 `await supabase.insert()` → 等回才 setBookmarked(true)。

**問題**：點星星要等 500ms 才看到金色 → 不確定有沒有按到、可能重複點。

**修法**：optimistic — 立刻 setBookmarked(true)、失敗才退回 + toast。

**估時**：~1 hr

### 🟢 P9：章節列表 / 部落格 / 論壇缺無限滾動

**證據**：未深查、但 v3 commit history 沒看到 IntersectionObserver / 無限滾動相關 commit。

**問題**：
- 章節 60+ 個列在一頁可能還好（已有 ChapterMap 視覺化）
- 部落格列表 / 論壇 thread 超過 50 筆會看不完

**修法**：
- 部落格列表頁 / forum 用 IntersectionObserver + 分頁
- 章節保持一頁（地圖視覺、不該分頁）

**估時**：~3 hr

### 🟢 P10：微互動 / 動畫

**問題**：
- 按鈕點下無 active scale / ripple
- 表單欄位 focus 無平滑邊框動畫
- 章節完成 XpToast 已有；但 lesson 完成 checkbox 沒勾號動畫
- toast 出現太突然、無 framer-motion stagger

**修法**：
- 全域 CSS：`button:active { transform: scale(0.97); transition: transform 100ms; }`
- 表單 focus border 加 transition
- 勾號用 SVG path draw 動畫（lottie / 純 SVG `stroke-dasharray`）

**估時**：~3 hr

---

## 4. 效能 / Web Vitals 推測

未實測、但依架構推測：

| 指標 | 推測 | 主要原因 |
|---|---|---|
| LCP（最大內容繪製） | 偏差 | 首頁 hero 圖 / 章節圖用 `<img>` 不 lazy |
| CLS（累積位移） | 高 | image 缺 width/height、loading.tsx 0 個 |
| INP（互動到下一次繪製） | 中差 | setLoading 阻塞、無 optimistic |
| TTFB | 應 OK | Next.js SSR + Zeabur 邊緣 |

實際數字要跑 Lighthouse / WebPageTest 確認。

---

## 5. 修法路線圖（分 sprint）

| Sprint | 內容 | 估時 | 預期效果 |
|---|---|---|---|
| **UX-S1 緊急止血** | 建 Toast 元件 + 全站搜替 alert/confirm（P1）| ~6 hr | 99% 突兀感消失 |
| **UX-S2 互動延遲** | 全站 optimistic update（P3 + P7 + P8）| ~10 hr | 點擊感從 500ms → 0ms |
| **UX-S3 載入感** | 加 loading.tsx skeleton（P4）| ~4 hr | 冷起來不再白屏 |
| **UX-S4 圖片** | 全站 `<img>` → `<Image>`（P2）| ~4 hr | LCP / CLS 改善 |
| **UX-S5 行動裝置** | Pet.tsx + 對話泡泡 + safe-area（P5）| ~2 hr | 手機學員體驗修好 |
| **UX-S6 細節** | callback loading（P6）+ 微互動（P10）+ 無限滾動（P9）| ~7 hr | 整體質感 |

**合計 ~33 hr ≈ 4-5 個工作日**。

**建議推進順序**：S1 → S2 → S3 → S4 → S5 → S6

**為什麼 S1 第一**：alert/confirm 是用戶最直接感受到「便宜感」的來源、改完瞬間質感提升、且 toast 元件後面所有 sprint 都要用。

---

## 6. 動工原則

- 每個 sprint 結束 commit + push、不批次堆積
- 每個 sprint 後跑 typecheck + 行動裝置 / 桌機 5 分鐘 smoke test
- 不動 auth / session / supabase clients（高敏感區）
- 改既有檔案優先、不新增 wrapper 層
- 套用 `feedback_ux_first.md` memory 全部原則

---

## 7. 備註與已知 limitation

- 本報告未跑 Lighthouse、Web Vitals 數字是推測
- 未實測行動裝置真實體驗（無模擬器）
- 未檢查 a11y（ARIA 標籤、鍵盤導航、screen reader）— 算 UX 但量太大、需單獨 audit
- 未檢查 i18n（v3 是否準備多語言）— 未來需求才看
