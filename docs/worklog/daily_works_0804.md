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
