# 工作日誌 2026-07-22

> 待辦主檔：`docs/todo/todo_list_0722.md`（今日 0721→0722）。
> 本日一路照「A→B→C→D」推進 + 一連串林董現場回報的 bug/小功能，逐項 tsc/vitest/build 綠後 commit/push。

---

## A · #3 新功能頁 UI i18n（運勢 / 訊息軍師 / 求職包）

- 抽 3 命名空間進 `messages/zh.json`：`fortune`(108)、`messageCoach`(55)、`jobKit`(27)。中文寫死→`t()`；scenario/tone 用穩定 id 動態 `t(\`scenarios.${id}\`)`、id 與 icon map 不動；ICU 佔位保留。
- 譯 en/ja/ko：`sync-ui-messages.mjs`（免費 Google）翻好三命名空間主體（+720 行、只增不刪）。
- ⚠️ `fortune.share` 8 顆 + `iching.lockedTitle/lockedDesc` 因 Google **今日擋量**未譯 → 暫 fallback 中文；**改天重跑 `node scripts/sync-ui-messages.mjs`（冪等）補上**（壞跑已 kill、hash 沒被污染）。
- ⚠️ `/me/ai-usage` 頁刻意用寫死中文（未進 i18n）——之後要多語再抽。

## 命理套件完成（延續昨日）

- **八字排盤**（`lib/bazi.ts` · lunar-javascript 正統四柱/五行/十神/納音）+ **易經·梅花易數**（`lib/iching.ts` 本地公有領域 64 卦、5 測試）。
- **易經 AI 深解付費 gate**：`lib/fortune-gate.ts` `getFortuneGate(userId,kind)`＝免費每日 1 次·付費無限（付費＝`hasAiUnlimited` 或 `getUserSubTier`；靠 `fortune_daily` 唯一鍵判當日用過沒）。**堵住 iching 每次都燒 LLM 的成本漏洞**——起卦/簡卦意永遠免費不限次、只有 AI 深解計次；locked 時 UI 顯示升級卡→`/pricing`。八字 AI 維持免費（依生日快取自然收斂）。

## 每日運勢分享（純文字 → 正式 OG 卡）

- `/api/og/fortune`：運勢渲染成 1200×630 OG 圖卡（星座/分數/整體/幸運色數、CJK 子集字型、CDN 快取）。
- `/fortune/share`：HTML 落地頁 `generateMetadata`→`og:image`（LINE/FB 抓得到預覽卡）。
- Fortune 分享面板：圖卡預覽 +「分享到其他 App」(Web Share、手機帶圖檔) + 連結顯示 + 複製連結 + 下載圖卡。RWD：手機底部 sheet、桌機置中 modal。

## 訊息軍師情境 icon 改 Lottie（後台可換）

- 12 情境接 `LottieIcon`(autoplay+loop)；沒設 URL → fallback「會自己一直動」的 lucide 線條 icon（`coach-icon-live` keyframe、非 hover、reduce-motion 關）。
- **全部後台可換**：`/admin/lottie-settings` 加 12 個 `coach_lottie_<id>_url` slot（label 標明前端是哪個情境卡 + 推薦搜尋連結 + 存後預覽 /message-coach）；`/api/app-settings` 公開讀 whitelist 加 `coach_lottie_` 前綴。
- ⚠️ LottieFiles/lottie.host 擋伺服器 fetch(403) 確認 → 無法自動填 URL、留可編輯 slot 由林董貼。

## §1 每日運勢收尾

- **修 bug：農曆生日西洋星座算錯**——八字本就轉農曆→國曆，但星座在 `profile` PUT 從 raw 生日算、農曆會錯 → 新增 `bazi.toSolarDate()`、先轉國曆再算星座。
- 無時辰 fallback（`hasHour`）本就有；cron #10（運勢推播）林董已設 → 標完成。

## §4.3 L2 程式沙盒（＝agent 能跑程式碼）

- 抽 `src/lib/code-runner.ts`：多語言外部隔離沙盒（Piston→Judge0→Wandbox fallback、20+ 語言、限時間/輸出 50KB），`/api/playground/run` 與 agent 共用。
- `tools.ts` 加 `code.run` 工具（risk=dangerous、逐次確認）——agent 寫碼→跑→看輸出。**不需 `ENABLE_SERVER_BROWSER`**（那只 gate browser.render）；用外部沙盒服務、Wandbox 免 key 墊底、免設定即可用。

## §4.4 成本/ROI Dashboard（使用者端）

- `/api/me/ai-usage`：本人近 30 天用量（`ai_usage_daily` 嚴格 `user_id` 過濾）+ `gateAiUsage` 額度（cap/used/remaining/unlimited/isPremium，注意 cap 對特權/Premium 是 optional）；DB 錯回零不 500。
- `/me/ai-usage` + `AiUsageClient`：KPI 磚（已用/額度/剩餘/呼叫/估計成本）+ 近 30 天 recharts 圖（tokens/呼叫/成本切換）；MeSidebar 加「📊 AI 使用量」。＊成本標「估計、非帳單」不誤導。

## 一連串現場 bug / 小功能

- **Footer 重設計**：霧面玻璃（backdrop-blur+saturate）+ 炫光（品牌漸層線 + 兩顆柔光暈 + `footer-shine` 掃光 keyframe、reduce-motion 關）+ 🏝️ 圓標；法律連結改 pill。
- **後台環境變數面板排版**：原 flex-wrap 讓「必要 badge 在左、右側狀態亂換行」破版 → 改穩定兩欄：左變數名/說明、右直排靠右（必要/選填 + 有沒有設定）。
- **Nami IDE**：①手機不切版——主佈局原本永遠 2 欄、展開檔案樹時編輯器被切掉 → `grid-cols-1 md:grid-cols-[260px_minmax(0,1fr)]`、側欄 minHeight 只 md+ 套；②加**複製鈕**：編輯器「複製程式碼」、輸出「複製輸出」、VirtualTerminal（整合終端機、共用元件）header 加複製鈕（章節內終端機也一起有）。
- **IP 定位**：`notify-visit` 改 ipwho.is（https 免費含縣市 region）+ ipinfo fallback。＊IP 本來就不準（新北被算台中屬正常、ISP/手機歸區域機房）、精準靠 🎯 GPS——非 bug、僅改善來源。
- **「在線」狀態失真**：`InteractionTracker` 每 15 秒無條件心跳 → 分頁只要開著就一直推 `last_active_at` → 後台顯示「幾秒前還在用」但人不在。改：心跳只在「分頁 visible + 近 90 秒有真人互動」才送、離開/背景/idle 即停。
- **履歷空狀態**：沒資料時「來上一課」原是純文字 URL、點不了 → 改 markdown 連結 `[👉 來 AI 島上一課](/chapters)`（renderMarkdown 本就支援）。
- **創作島「接入創作」只帶作品**：chat `weaveMsg` 原把綠寶整段回覆（含開場白/結尾閒聊）當作品 body → 加 `stripChatter()`：只留作品本體（歌詞含 Suno 提示詞、文案本體都保留）、砍開頭≤2 行/結尾≤3 行明顯寒暄與純表情、偵測 [Verse]/suno 設 workType=song。三案例實測正確。（Hub compose 路徑本就用結構化 r.body/sunoPrompt、乾淨。）
- **懸浮筆記鈕「不見了」**（230.jpg）：非被刪、是被舊 localStorage 推到畫面外。鈕可拖曳、位置以 **translate offset** 存 `lessonNoteBtnPos`；7/7 基準左下→右下、7/12 又右下→左下但 key 沒換 → 在右下版拖過左邊存下的負 offset（如 x:-1400）套到左下基準 = 飛出左邊界看不到。修：載入與拖曳存檔都把 offset **clamp 回可視範圍**（越界歸零並清舊值）→ 受影響者下次進章節鈕自動回左下、以後拖到畫面外也自癒。

## C · 章節深寫 ch40《Kotlin / Dart》

- 依 [[content-rewrite-interactive-initiative]] 深寫標準（守 beginner-friendly spec：術語英中對照 + 四區塊標籤 + 補「為什麼」敘事、不砍原內容只補一層）。
- **修真 bug**：40.1 內容原本**被截斷**——結尾「秒速決策樹」是個沒閉合的 code fence（` ```\n我`），線上顯示破圖 → 補完整決策樹 + ☕收尾。
- **除罐頭練習題**：40.5 的 exercise 原是通用「把心法變小習慣」模板（答案在講起床列 3 件事、跟 Compose 完全無關）→ 換成真 Compose 判斷力題（宣告式 vs 命令式為何少 bug / remember 為何必要 / remember vs ViewModel 何時用哪個）。
- **深寫「長但表面」課**（原本只列 code + 工具、無解說）：40.2 Kotlin+Android（3.2k→6.3k）、40.3 Dart+Flutter（3.6k→6.2k、加 🖥️ 終端標籤）、40.5 Jetpack Compose（2.8k→4.5k）、40.6 Dart 進階+Flutter（2.8k→4.2k）——每個 code 區塊之間補「這在做什麼/為什麼這樣寫」、術語首現給中文白話（Activity/Composable/StateFlow/DI/AAB/dp/recomposition/null safety/records/pattern matching…）。40.4 Coroutines+Flow 本就是深寫範本、保留不動。
- **修 summary 錯字**：「拋棄複雜的 XML 或 XML」→ 通順版；另把「Android 四大元件」那條改成更貼本章的三層架構描述。
- heading 結構刻意不動 → outline TOC 仍對得上。`node scripts/import_chapters_to_db.mjs ch40` 已同步進 DB（6 lessons / 0 errors）；線上 revalidate=60 即時生效。

## C（續）· ch63 深寫 + 教具霧面玻璃美化 + 教具開始鋪到各章

- **ch63 附錄C（AI/Prompt 速查）深寫**：reference 章、本就內容密；補術語英中對照白話——63.1 開頭補「token / context / in-out 價格」三詞白話；63.3 補**參數白話**（temperature / top_p / nucleus sampling / top_k / frequency-presence_penalty / stop / seed / max_tokens 各在調什麼、口訣）；63.4 補 embedding & cosine 白話 + ivfflat/hnsw 索引註解。inline 不動 heading → outline 不變。
- **教具霧面玻璃美化（一次改·全 15 教具受惠）**：新增 `.demo-glass`（半透明 + backdrop-blur + accent 漸層頂邊 + 柔影 + inset 高光）與 `.demo-glass-head`（半透明標題列）於 globals.css；sed 把 15 個 demo 元件統一的外框/標題 class 換成 glass class（`rounded-xl border border-border bg-bg-card`→`demo-glass`）。深淺色皆調。
- **教具開始鋪各章**（林董要求：盡量 80 章都有教具）：先掛深寫章——ch40：40.1 decision-quiz（Kotlin/Flutter/RN 路線測驗）、40.5 scenario-judge（Compose/狀態 6 題對錯判斷）；ch63：63.1 decision-quiz（該用哪個 LLM）、63.2 prompt-lab、63.4 workflow-flow（RAG 問答流程）。全 import DB。
- **教具覆蓋盤點**：80 章中 24 章已有教具、**56 章待補**（清單見 scratchpad）。續掃：以 scenario-judge（好/風險/不行判斷·幾乎每技術章都適用）為主力 + decision-quiz / json-tree / workflow-flow / agent-loop 依章配。

## 教具鋪滿全站（林董：盡量 80 章都有教具）

- **目標**：80 章原本只 24 章有教具 → 補到全站。教具型別 15 種（scenario-judge 判斷 / decision-quiz 選型 / json-tree / workflow-flow / agent-loop / priority-matrix / prompt-lab 等）。
- **做法**：我先掛深寫章（ch40/63/68/72–75），其餘 49 章用 6 個平行子代理依「DEMO_SPEC.md」（統一 schema + 語氣 + 選型指南）各認領一批、讀該課內容後掛 1–2 個對題教具（只加 `demos` 欄、不動既有內容）。
- **我方驗證（不只信子代理）**：自寫 `validate_demos.py` 逐一驗 demo type ∈ 支援集、scenario-judge correct∈{ok/risk/no}、decision-quiz scores key ⊆ outcomes key、workflow-flow node kind 合法…等 → **48 章 88 個 demo 全 schema-valid**；再 `import_chapters_to_db.mjs` 全數灌 DB（0 errors）。
- **本批完成 47 章**（A/C/D/E/F 批 + 我 7 章；ch11/15–21 批 B 完成後再併）：涵蓋 ch00-10、22-41、46、61-79 等。每章 code 之間的 demo 都扣該課實際內容（如 ch04 ===/型別轉換判斷、ch18 NoSQL 文件 json-tree、ch22 部署 pipeline workflow-flow、ch79 RAG agent-loop）。
- 教具外觀已先做**霧面玻璃**（見上）＝ 補進來的教具一律有質感。

## 🏁 收尾健檢（本日全部改動一次過）

- **API/UI/DB 接線**：`node scripts/audit-db-columns.mjs` → 我的新查詢（`ai_usage_daily`/`fortune_daily`/`app_settings`）全部乾淨；殘留 ✗ 都是既有 template-literal 欄位名與 OG `<img src>` URL 的誤報。**本批零新增 migration**（全讀既有表/欄）。
- **資料表確認**：`ai_usage_daily` 欄位（tokens_input/output/cost_usd/message_count）於 `supabase/ai_migration.sql` 存在；`fortune_daily` kind='iching' 沿用既有唯一鍵；coach_lottie_* 存既有 `app_settings`。
- **RWD**：新 UI 響應式 class 齊（分享 sheet 手機底部/桌機 modal、footer 手機堆疊、ai-usage grid-cols-2 md:grid-cols-3/4、nami-ide grid-cols-1）。
- **建置**：`npx tsc --noEmit` ✅ 0 · `npx vitest run` ✅ 169/169（23 檔）· `npx next build` ✅ exit 0。

## 🔴 待林董手動

- 訊息軍師真 Lottie：`/admin/lottie-settings` →「💬 訊息軍師·…」12 格貼 lottie.host URL（沒貼也會動、是線條 icon）。
- 補譯：Google 擋量退了跑 `node scripts/sync-ui-messages.mjs`（補 fortune.share 8 顆 + iching locked 2 顆，冪等）。

## ⏳ 下次開工（都在 todo_list_0722.md）

- **C** 章節深寫 ch40/63/68/72–75、**D** 互動教具（建議各開專注 session）。
- **§6.8** 付費 gating 深化（兩套金流收斂 / plus-pro 分層 / 統一 402 helper）＝動金流、單獨做。
- 稍早貼的 §2.x 分身島 / §三 機會島大量 backlog——多為大工程或需 🔴 外部帳號、已在 todo。
