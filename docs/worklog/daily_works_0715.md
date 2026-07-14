# 工作日誌 2026-07-15

> 現行待辦主檔已改 `docs/todo/todo_list_0715.md`。本日大量功能 + bug 修復，全部走鐵規則收尾（tsc / vitest / next build 綠才 commit）。

## 🐛 開工修 4 隻 bug
- **代理回覆斷掉 / 顯示整包 raw JSON（214+216+217，同根因）**：done 的產出型 summary 很長 → `planNext` maxTokens 900 把 JSON **截斷** → 收不了尾、parse 失敗 → 退回把整包 raw JSON 當答案（畫面出現 `{"thought":...}` 且內容斷）。修：`parseDecision` 截斷容錯抽 summary（沒收尾引號也能救）＋ 完成守門（summary 仍是 raw JSON/思考草稿/空 → 用 `finalizeFromHistory` 乾淨重產）＋ maxTokens 900→3000/3500。四種 parse case 本機測過。`91d9b985`
- **留言 @提及標記（215）**：新 `MentionTextarea`（純 textarea @自動完成，打 @→`/api/mentions` 搜人→↑↓/Enter 選），`resolveMentions` 送出前把 @顯示名→token `[[user:uuid|label]]`（email 不誤傷），顯示端渲染成可點連結。**討論區＋部落格＋創作者社群三處留言都接上**，POST 解析 token→通知被 tag 的人。`0b8aa4e7` `3a737857` `5a5f46a9`

## 🚀 依「一直做」指示接著做
- **社群一次上傳 20 張圖 + IG 風輪播**：`ImageCarousel`（手機左右滑 scroll-snap、桌面 hover 箭頭、N/N 計數+圓點、單張直接顯示）；社群發文改多選、上限 20、縮圖可移除、`createPost` slice(0,20) 保底；feed + 單篇貼文頁都換上。`867c267b`
- **@提及升級**：接 **LINE 推播**（`notifyMention` 共用助手＝in-app 鈴鐺 + LINE flex，三處統一）＋ **編輯留言也支援 @自動完成**。`c51e4a0e`
- **首頁沉浸式滾動穿越 Hero**：高軌道(175/210vh)+`sticky` 舞台，`useScroll` 驅動島圖縮放(1→1.45)/星層錯速景深/遮罩加深/文案淡出→尾段「進入 AI 島」引導。全程尊重 `prefers-reduced-motion`（退化成靜態、transform 皆常數、min-h 保底）。純現有素材、之後五層對齊素材到位可升級。`177c9c9b`　⚠️ **待林董目視驗收**（Chrome 擴充沒連上、只驗 SSR/build 綠）。
- **`index-img.md`**：加沉浸滾動素材規格（免費圖層 transform 做法 + 五層對齊列第一優先 + scroll-scene 錨點）。`adc94ffa`

## 🎯 機會島/分身島「排序直接做」批（不用林董出手者優先）
- **#1 機會島 AI 作品分析**：`/opportunities/analyze` + `/api/opportunities/analyze-work`。貼網址(伺服器抓取轉文字)或文字→AI 出能力圖譜(定位/技能長條+依據/優勢/補強/方向/機會關鍵字→導搜尋)；robust JSON+正規化夾範圍、登入才用、rateLimit 20/hr、唯讀不存。機會島 header 加入口、OpportunityBrowse 讀 `?q=`。冒煙：頁 200、API 401(guard)。`13a831ad`
- **#2 省錢模式三檔**：分身島輸入區 💸省錢/⚖️平衡/💎品質。saver=全程便宜、balanced=需要才升級(原行為)、quality=一律強模型。`costMode` UI→API→launch→orchestrator；`strongModel` 用**預設參數穿透** planNext/finalize/merge/subAgent → **balanced 位元級零改變不回歸**。`25934609`
- **#3 AI 成本 P1 創作者綠寶軟上限**：確認**已在 code**（`CREATOR_DAILY_SOFT_CAP` 預設0=關 + creator chat fail-open 檢查 + `gateHighTierModel` 只擋高階、聊天免費）。標記完成。`f486ceaf`
- **#4 PDF 規則解析**：`rules-summary` route 加 `url` 參數→簡章網址/PDF 連結伺服器抓取（PDF 用 `unpdf` 純 JS 解析、HTML 去標籤）→併進既有 AI 規則整理；RulesSummary UI 加網址欄。unpdf 本機從真 PDF 抽字實測 OK。（版本比較 diff 待做）`7403a197`
- **#5 雷達 V4**：大型 cron pipeline 重構、動生產排程、無法離線安全驗證 → **留待林董在場監控時做**。

## 🛡 其他
- **每使用者每日任務上限**（`launchAgentTask` fail-open、預設80、`AGENT_DAILY_TASK_CAP` 可調、admin 免、排程不計）。`2caeafca`
- 待辦滾動：`todo_list_0715.md` 建為新主檔（所有未完成 + 🔴 需林董項），`todo_list_0714.md` 轉歷史，`CLAUDE.md` 指標更新。

## 🚨 收尾檢查（鐵規則）
- **API↔前後端↔欄位**：新 API（analyze-work / export / mentions 通知 / rules-summary url / agent costMode）都前後端接對、smoke 過（頁 200 / API 401 guard）。
- **DB / 資料表**：本日除社群輪播用既有 `ci_posts.images`(jsonb) 外**無新 migration**；通知走既有 `notifications`(kind free TEXT)。
- **UI 接對**：每個新按鈕/欄位都連到真 API、非空殼。
- **RWD**：新元件都用 flex-wrap / max-w / grid sm: 響應式；結果卡按鈕列、成本模式列、機會 header、輪播、分析頁 chips 皆窄屏換行不溢出。
- **建置**：每項 `tsc --noEmit` ✓、`vitest run 137` ✓、`next build` exit0 ✓。
- **機密**：未動 `.env.local`；新依賴 `docx pptxgenjs exceljs unpdf`。
- **PWA**：未動 manifest/sw。
