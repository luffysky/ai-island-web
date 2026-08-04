# 工作日誌 2026-08-04

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
