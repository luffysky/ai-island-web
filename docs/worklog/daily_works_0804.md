# 工作日誌 2026-08-04 ～ 08-05

> 待辦主檔：`docs/todo/todo_list_0801.md` §2.8。
> 本段主軸：**分身島語音代理 + client-action 中繼**（規格 `docs/speech_agent.md`，經 GPT 兩輪覆核強化契約）。分批進行，每批 tsc/vitest/next build 全綠才提交；push 依 ~30 分批次、不打斷 Zeabur build。

---

## 設計定調（開工前）
- 盤點既有架構：**七成地基已在**——統一 Tool Registry（`tools.ts TOOLS[]`）、風險分級 approval、`launchAgentTask` 共用 thread/記憶/RAG/預算、`device.*` stub + bridge 配對。語音只是輸入/輸出層，走既有 pipeline、不建第二套 Agent。
- 唯一真缺口＝執行位置：Agent 跑伺服器背景，但 `open_url`/`navigate_internal` 要動使用者瀏覽器 → **client-action 中繼**（工具只派信封、前端輪詢執行回報）。
- GPT 覆核強化契約（已納 todo §2.8.3.1 / §2.8.5）：結構化白名單 union、唯一 action id + 生命週期 + session 去重、不繞 approval、完成語意寫回 task、**原子 RPC 更新**（禁 read-modify-write）、new-tab 需使用者手勢、輪詢不因 status=done 停、acknowledged 逾時可手動重試不自動重開。
- 偏好先走 localStorage、**不無條件建表**（GPT 點 9）。

## Batch 1 ✅ 語音 provider 抽象層 + utils + 測試
- `src/features/voice/types.ts`：`VoiceState`（7 態）、`SpeechError`、`SpeechToTextProvider`/`TextToSpeechProvider` 介面、`VoicePreferences`+預設。
- `providers/browser-speech-to-text.ts`：`BrowserSpeechToTextProvider`（(webkit)SpeechRecognition、`zh-TW`、partial/final/error、`continuous=false` 非常駐 push-to-talk、最小型別不用 any 滿天飛）。
- `providers/browser-text-to-speech.ts`：`BrowserTextToSpeechProvider`（speechSynthesis、開講前先 cancel、失敗一律 resolve 不 reject）。
- `hooks/use-speech-recognition.ts` / `use-speech-synthesis.ts`：React 包裝（後者朗讀前先 `sanitizeTextForSpeech`）。
- `utils/sanitize-text-for-speech.ts`：去程式碼/行內 code/圖片/連結留字/裸網址→「連結」/JSON·工具紀錄行/Markdown 符號/HTML；過長截到句界標 truncated。
- `utils/speech-error-message.ts`：錯誤碼→繁中（不吐原始 exception）+ `normalizeRecognitionError`。
- 測試：`sanitize`（8）+ `speech-error-message`（3）= **11 綠**；tsc ✅、next build ✅。

## Batch 2 ✅ AgentClient 語音 UI（驅動既有文字 pipeline、可獨立上線）
- **移除**原本寫死在聊天元件的 inline STT（`toggleVoice`/`recRef`/`listening`/`voiceSupported` any 一把抓）——正是規格 §一 要避免的反模式。
- `hooks/use-voice-prefs.ts`：偏好走 localStorage（autoSend/replyEnabled/語速…）、首渲染回預設免 hydration mismatch、custom event 跨元件同步。
- `hooks/use-voice-agent.ts` `useVoiceReply`：語音輸出側——依偏好朗讀分身回覆（先 sanitize、同任務只唸一次）。
- `components/VoiceControls.tsx`：麥克風＋即時 partial 預覽＋錯誤繁中＋autoSend 倒數（可取消）＋設定彈窗（autoSend/朗讀/語速）＋朗讀中停止鈕；**不支援自動不顯示（保留文字聊天）**；再次收音前先停播。
- AgentClient 接線：輸入區換成 `<VoiceControls>`（STT 填輸入框、autoSend 走既有 `run()`）；輪詢完成時 `maybeSpeak` 朗讀 summary（用 ref 避免 effect 重設 interval）。
- 語音**完全走既有 pipeline**（thread/記憶/RAG/預算/approval 不變）；tsc ✅、next build ✅（僅既有 admin/errors 警告）。

## Batch 3 ✅ client-action 中繼 + navigate_internal / open_url
- `lib/agent/client-actions.ts`（純函式、10 測試）：discriminated union（navigate_internal / open_url）；`validateInternalPath`（/ 開頭+站內白名單+擋 //·scheme·traversal·空白；連字號路由如 /message-coach 過）；`validateExternalUrl`（正式只 https、dev 可 localhost、擋 js:·data:·file:·blob:）；狀態機 `canTransition`（completed/cancelled overwrite-protected 冪等；**failed 保留手動重試**推進＝GPT 點 3）；`needsUserGesture`（new-tab 開頁）；`isStale`（acknowledged 逾 30s）。
- migration `agent_client_actions_migration.sql`（跑 prod）：`agent_tasks.client_actions jsonb` + **兩支原子 RPC**——`agent_client_action_append`（jsonb `||` 單條 row-lock、並行不遺失）、`agent_client_action_update`（jsonb_agg 重映射該 id、completed/cancelled 不覆寫）。**杜絕 Node 端 read-modify-write**（GPT 點 4）。
- `tools.ts`：`dispatchClientAction`（只標 pending、不因派信封就 completed＝GPT 點 6）；`navigate_internal`(read 自動)、`open_url`(write→走既有 approval 讓使用者先看網址＝GPT 點 5/點 3)。
- ack route `/api/agent/tasks/[id]/client-action`（POST 冪等，phase→status+時間戳）。
- AgentClient 執行器：輪詢讀 `client_actions`→自動跑「導航/same-tab」（`processedRef` session 去重＝GPT 點 2）；**new-tab 開頁不 auto window.open**（會被擋）→ `ClientActionBar` 卡片由使用者點「開啟」在手勢內開、popup 被擋回 failed 不假裝完成（GPT 點 1）；**輪詢不因 status=done 停**（還有未結 client-action 就續輪詢、收尾只跑一次＝GPT 點 2）；stale/failed 顯示「重試」由使用者手動（GPT 點 3）。
- 全綠：tsc ✅ · vitest **208**（+21）✅ · next build ✅。已 push（與遠端 rebase 後）。

## Batch 4 ✅ search_course + agent_status（伺服器工具）
- `search_course`（read/server）：查 `chapters`（title/description ilike）＋`dictionary_terms`（term/zh_name/slug）＋站內功能頁（`matchSiteFeatures` 純函式），回標題＋站內 path。找到→可接 `navigate_internal`。
- `agent_status`（read/server）：查該使用者近 8 筆 `agent_tasks` 狀態，回 active 數＋清單（回答「現在有哪些代理在工作」）。
- **修正**：章節路徑是數字 id（`/chapters/26`、非 ch26）——`navigate_internal` 說明同步更正、並提示不確定 path 先 search_course。
- 3 測試（matchSiteFeatures 命中/空/不亂配）；tsc ✅ · vitest **211** ✅ · next build ✅。

## Batch 5 ✅ Roadmap 文件 + 收尾
- `docs/agent-device-control-roadmap.md`：Phase 2（手機控電腦 Desktop Agent、`device_connections`/`device_commands`、`DeviceTransport`、service key 不落端）＋ Phase 3（Android ADB Adapter、多裝置並行）＋ 權限/確認/緊急停止/日誌隱私 ＋ **Whisper/Piper 未來替換點**（provider 介面已預留、換注入即可）。點出「決策在雲·執行在端·回報」骨架＝Phase 1 client-action 的放大版。

## 🏁 Phase 1 網頁語音代理 MVP — 驗收
- 走既有 Agent pipeline（不建第二套、共用記憶/RAG/預算/approval）；STT 不支援自動退回文字；autoSend 預設 false；不存錄音。
- client-action 中繼滿足 GPT 兩輪全部契約（白名單 union／唯一 id 生命週期＋三重去重／不繞 approval／完成寫回不假裝／原子 RPC／new-tab 需手勢／輪詢不因 done 停／stale·failed 手動重試）。
- 全綠：tsc ✅ · **vitest 211（+24）** ✅ · next build ✅。DB：`agent_tasks.client_actions` 欄 + 2 RPC 已上 prod。

---

## F · 遠端加工批（林董陸續丟需求）
- **CI hardening**（`docker.yml`）：GHCR push 403 診斷＝暫時性（重跑綠）；順手 `provenance:false`+`sbom:false`、加自動 prune 舊版本（留最近 15、防儲存爆）。
- **語音設定彈窗直排 bug**（235.jpg）：VoiceControls 兩個彈窗用 inline width（覆蓋 runtime 寬度覆寫、杜絕 CJK 直排）+ 視窗寬度守衛。
- **生活助理接口**：`/agent` 按鈕列加「🧰 生活助理範本」→ `/agent/templates`（原本只能從首頁進）。
- **分身島全面審計**（subagent）：結論＝**唯一假功能是 `/agent/social` 社群發布中心**（無 send adapter/`src/lib/social/` 不存在/排程無 cron/永遠只存 draft）；templates/office/主任務/工具/匯出**皆真接後端可用**。→ social 頁加「⚠️ 發送功能開發中」橫幅、header 不再宣稱自動發（誠實化，等 §2.3.2 接 adapter）。
- **辭典前端大補計畫**（todo §4.2.1.5）：8 批~160 條 HTML/CSS/JS 零基礎白話詞條（補現有 seed 偏後端的缺口），每批先 slug 去重。
- **§5 每日晨報+天氣**（§5.1✅/5.2~/5.3~）：`lib/weather.ts`（Open-Meteo 免 key 免費、geocode+forecast+WMO 中文+確定性生活建議+LLM prompt、6 測試）；`daily-brief` cron 標題改「🌅 今日晨報」、有同意定位者首列加天氣+建議（同城快取零成本、失敗不擋）。剩運勢一句/重要提醒兩塊 + LLM 建議接線待補。
- 全程 tsc ✅ · vitest **217（+6 weather）** ✅；分批 commit/push（rebase 遠端）。

## G · 語音體驗 + 一般聊天模式（林董遠端）
- **一般聊天模式**：AGENT_MODES 加「🗣️ 一般聊天」（prefix 導向朋友式口語、簡短、不列點不念稿）——配語音回覆聽起來像聊天而非念文件。
- **修 TTS 唸到一半自己停**：Chrome 對長 utterance 有 ~15 秒看門狗會砍掉 → `chunkForSpeech` 把長文切句子級小段（≤160 字、標點後切、無標點硬切）逐段接力唸；`stop()` 用世代序號真正中止（cancel 後不會又接著唸）。4 測試。
- **可選音色**：`useVoices`（列瀏覽器中文語音、等 voiceschanged）+ 設定彈窗加「音色」下拉 + 試聽鈕（選 Google/Microsoft 中文語音較自然）。preferredVoice 存 localStorage、朗讀時套用。
- ＊誠實限制：真正「對話級自然語音」受限於瀏覽器 Web Speech；要更自然需雲端 TTS（roadmap 已預留 CloudTextToSpeechProvider，屬付費/後續）。
- tsc ✅ · vitest **15 voice（+4）** ✅。

## H · 裝置控制端到端（§2.9·跨 repo）
- **盤點**：Phase 2 伺服器側早已存在（`agent_device_bridges`/`agent_device_calls` + `bridge/pair|poll|result` + orchestrator `dispatchToDevice`）→ roadmap 的 device 表就是這些、不重造。缺的只有桌面客戶端。
- **桌面客戶端**（新 repo `ai-island-bridge`，原本只有 README）：
  - 2.9.1 MVP：poll 迴圈 + `filesystem.list/read/write`（白名單資料夾、擋 `..` 穿越）+ 回報（e8f2736）
  - 2.9.3 `system.run_command`（白名單、預設停用、擋 shell 串接；eed01fd）
  - 2.9.2 `browser.*`（Playwright headless、延遲載入；550fe7e）
- **2.9.4 緊急停止**（本 repo）：`/api/agent/tasks/cancel-all`（取消所有 LIVE 任務 + 待辦 device_calls）+ `/agent`「⏹ 全部停止」鈕。**檢查**：API✅新路由 · DB✅更新既有表無 migration · UI✅鈕接路由+刷新 · RWD✅在既有 flex-wrap 列 · PWA n/a。tsc/next build ✅。
- 剩 2.9.5 `.exe` 打包 · 2.9.6 Android ADB · 2.9.7 傳輸升級。

## H2 · §2.9.5–2.9.7 完成（0805，bridge repo）
- **2.9.5 打包**：Node SEA（`sea-config.json`+`build.mjs`→`npm run build` 單一執行檔）+ `release.yml`（matrix win/mac/linux、**macos-latest 免費 build Mac 版、不用有 Mac**）。iOS：沙盒禁 fs/shell/常駐→做不出等效桌面助手（平台限制非硬體）。
- **2.9.6 Android adb**（六件）：AI 島 `android.list_devices/open_url/open_app/home/back/screenshot`(needsDevice)；桌面 adb 執行器（`execFileSync`+參數陣列不經 shell、url/package 驗證、多裝置 `adbTarget`、ENOENT 提示）；禁任意點擊/輸入密碼。
- **2.9.7 自適應輪詢**：忙 700ms／閒退避到 6s。真 Realtime 卡在 device-token 非 Supabase JWT + Zeabur 無持久 WS → 需 JWT 簽發或專用 WS server（另立、已註記）。
- bridge commits：12717b0(SEA)·f74a311(android)·874e4d4(自適應)。

## I · 語音/後台體驗打磨 + 競品分析（0805）
- **語音代理 Phase 1**（規格 speech_agent.md）：STT/TTS provider 抽象 + client-action 中繼（navigate_internal/open_url 白名單+原子 RPC+冪等）+ search_course/agent_status；一般聊天模式；修 TTS 唸一半停（chunk 接力）；音色分組全列；手機彈窗改底部面板避開 nav。
- **/agent 聊天氣泡**：目標右泡泡、分身左泡泡；模式/工具箱/思考過程/操作鈕全可收合（跑完自動收起思考）。
- **後台審計**：功能真假（~95% 真、4 空殼列 §7.0）+ 前端入口（補 assistant/blog-seed 等孤兒進側邊欄，共補 8 頁）+ 側欄獨立 sticky 捲動 + 目前頁高亮。
- **競品戰略**：WebFetch/WebSearch 查證 OpenClaw（開源代理框架·安全崩壞 CVE/26%技能漏洞）+ NVIDIA NemoClaw（沙盒層）→ `docs/competitive/` + `/admin/strategy` 頁 + todo §2.10 三層策略。
- **CI**：移除 concurrency（true/false 都會取消被取代 run→紅叉）→ 完全不再出現 canceled。

## 🏁 收尾健檢（0805）
- **建置**：tsc ✅ · vitest **221** ✅ · next build ✅。
- **DB**：`agent_tasks.client_actions` 欄 + 2 個 client-action RPC + `agent_device_calls` 皆在；supabase/ 無未跑 migration（本段裝置控制全複用既有表）。
- **API↔UI**：新路由 `cancel-all` / `client-action` 已接前端；android/device 工具走既有 bridge 佇列；route 註冊審計 459 支全有 export（fetch 對不到者皆 template-literal/.tsx 誤報）。
- **RWD/PWA**：語音彈窗手機底部面板 + strategy overflow-wrap 修破版；聊天氣泡 max-w 不溢出；**PWA 未動**（manifest/SW 不受影響）。
- **跨 repo**：桌面客戶端 `ai-island-bridge` 三平台打包待推 `v*` tag 觸發 release。

## J · 0805 下半場（UI/天氣/儀表板/競品/裝置 release/Phase2 規劃）
- **/agent 聊天氣泡 + 收合**：目標右泡泡/分身左泡泡；模式/工具箱/思考過程/操作鈕可收合、跑完自動收思考。
- **語音**：修「唸一半自己停」(chunk 接力)、音色依語言分組全列、手機彈窗改底部面板避開底部 nav。
- **RWD 一批**：voice/strategy/ReplyForm 破版修；後台側欄 `sticky` 獨立捲動+目前頁高亮；後台補 6 頁側欄入口 + 2 孤兒(assistant/blog-seed)。
- **競品戰略**：查證 OpenClaw(安全崩壞 CVE/26%技能漏洞)/NVIDIA NemoClaw(沙盒層) → `/admin/strategy` + `docs/competitive/` + §2.10 三層策略。
- **裝置控制 §2.9 全 7 項完成 + 上架**：桌面 bridge(filesystem/browser/system/android adb)、SEA + GitHub Actions 三平台 release(**v0.1.0 已推、win/mac/linux zip 皆 HTTP 200**)、自適應輪詢、緊急停止；`DESKTOP_DOWNLOAD_URL` 修 `releases/latest`。本機也 build 出 91MB exe 實測可跑。
- **天氣/晨報**：`lib/weather`(擴體感/濕度/風/日出日落) + `/api/weather`(不存 lat/lng·隱私) + `WeatherCard`(讀當下定位) + `buildMorningBriefCard` 專屬 LINE 卡；查核所有 LINE 通知卡皆用 `buildSimpleCard/buildListCard/buildFortuneCard`（已美化、無醜卡）。
- **每日情報儀表板 `/daily` Phase 1**：天氣 hero+明細+生活建議+每日一句/單字/Tip+月相+運勢卡+**今日待辦(localStorage)**；首頁「🌅 每日情報」入口；新 lib `moon`/`daily-content`；修 `weatherEmoji(999)` 測試。
- **CI**：移除 `concurrency` → 徹底不再出現「operation was canceled」紅叉。
- **Phase 2 規劃**：subagent 完整盤 Space 架構 → §5.7 port 計畫（theme/background/lottie/字體/後台字體安裝器/拖拉 widget）。主題需拆 palette/mode 雙軸(動全站 `dark:`、風險高) → 林董拍板 **B：下輪專注 session 專心做**。

## 🏁 收尾健檢（0805 晚·B 收工）
- **建置**：tsc ✅ · vitest **225**（33 檔）✅ · next build ✅（`/daily` 27kB）。
- **DB**：**無未跑 migration**（天氣/儀表板/裝置全複用既有表或零 DB；今日新 DB 物件＝無）。
- **API↔UI**：`/api/weather` ↔ WeatherCard/DailyDashboard 接對；首頁「每日情報」→ `/daily`；route 全註冊。
- **RWD/PWA**：語音彈窗/strategy/儀表板/後台側欄皆響應式不破版；**PWA 未動**。
- **全部 commit + push**（本 repo + `ai-island-bridge`）；`docs/widget.md`(Phase 2 spec) 已納入。

### 天氣定位下拉 fallback + /daily 進側邊欄（0805）
- **痛點**：WeatherCard/DailyDashboard 定位被拒 → 只剩一句「沒拿到定位權限」死路。
- **解**：照抄 Space `tw-regions.ts`（22 縣市→區靜態表）新增 `src/lib/tw-regions.ts` + 共用 `LocationPicker.tsx`（縣市→區兩段下拉，選「區名」打 `/api/weather?city=`，Open-Meteo geocode 反查、不外呼、不存 lat/lng）。
- **接法**：WeatherCard(`/fortune`) + DailyDashboard(`/daily`) 的 denied/error/idle **與** done 狀態都放 picker；選過的區存 `localStorage(ai_island_weather_city)`、進頁優先直接套用（不再打擾定位）。`/api/weather?city=` 早已支援、**零新 DB**。
- **導覽**：`/daily`（🌅 每日情報）加進 TopNav 探索島抽屜 `NAV_LINKS` **最上面** + `nav.daily` 四語 i18n（每日情報／Daily Brief／デイリー情報／데일리 브리핑）。
- **答疑**：`/admin/strategy`(⚔️ 競品戰略分析) 本就在後台側欄「🏝️ 總覽」群組**最後一項**（🤖 數據問答助理 之下）。
- **建置**：tsc ✅ · vitest 225 ✅ · next build ✅（`/daily` 8.37kB）。RWD：下拉 `flex-wrap`+`min-w-0` 窄螢幕不溢出。
