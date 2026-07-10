# AI 島行動代理 — Android 原生 Agent 實作規劃（Phase 2/未來）

> ⚠️ 此為**規劃書**，非本 repo 可建置的內容。Android 原生 Agent 是**獨立 Kotlin 專案**（需 Android SDK/Studio、Play Console），
> 這裡先把設計、架構、對接方式、Play 政策雷點定好，之後開新 repo（`ai-island-android/`）照此實作。

## 0. 定位（先講清楚差別）
- **「手機遙控電腦」已完成**（Phase 2a/2b）：手機瀏覽器開 `/agent`（RWD/PWA）→ 下令 → 已配對電腦的桌面助手執行 → 串回手機。**不需要原生 App。**
- **本規劃 = 「Agent 操作手機自己」**：讓 Agent 在**手機這台裝置上**讀畫面、點按、輸入、截圖（例：幫我在某 App 裡完成一個流程）。這才需要 Android 原生 + AccessibilityService。

## 1. 架構
沿用現有雲端佇列，Android 端就是**另一種 Device Bridge**：
```
手機 App(Kotlin)
 ├─ Foreground Service：長駐、通知列可見、可停止（政策要求）
 ├─ Bridge Client：輪詢 /api/agent/bridge/poll（帶裝置 token）→ 領 device_calls → 執行 → /result
 ├─ AccessibilityService：讀 UI 樹（節點/文字/座標）、點擊、輸入、滑動、返回/home
 └─ MediaProjection：截圖（screen.capture）
雲端（現有，不用改）：agent_device_calls 佇列 + agent_device_bridges（platform='android'）
```
- **對接零改動**：Android 用同一套 `bridge/poll`、`bridge/result`、裝置 token。只需在 `agent_device_bridges.platform` 記 `android`、工具集是 android 版。
- 配對：手機 App 掃 `/agent` 顯示的 QR（內含一次性 pairing token）→ 存本機 → 開始輪詢。

## 2. 工具集（android platform）
| 工具 | 風險 | 實作 |
|---|---|---|
| `ui.read` | read | AccessibilityService 匯出當前畫面節點樹（文字/可點元素） |
| `ui.tap` | write | 依文字/資源 id/座標點擊（需確認） |
| `ui.input` | write | 對聚焦欄位輸入文字（需確認） |
| `ui.swipe` / `ui.back` / `ui.home` | write | 手勢/系統導覽 |
| `app.open` | write | 依 package 開 App |
| `screen.capture` | read | MediaProjection 截圖回傳 |
> 觀察正規化：`ui.read` 只回**可互動元素 + 文字**（別整棵樹塞模型），同桌面助手的省 token 原則。

## 3. 權限與揭露（Play 政策雷點 — 這關最硬）
- **AccessibilityService** 屬敏感權限：Play 要求 **Prominent Disclosure + 明確用途**，且用途須真的服務使用者（無障礙/自動化助理）。誤用會被下架。
- **前景服務通知**常駐、**隨時可一鍵停止**、**清楚顯示 Agent 正在做什麼**（可視化、可中止 — 與我們「透明、可教、可停」的定位一致）。
- 寫入/高風險動作**仍走雲端逐次確認**（L2/L3），手機端再加一層本機確認。
- 敏感畫面（銀行/密碼欄）預設**不截圖、不讀值**；黑名單 package。
- 首次啟用走完整 onboarding 說明會做什麼、不會做什麼、如何關閉。

## 4. 技術選型
- Kotlin + Jetpack Compose（設定/狀態 UI）。
- `AccessibilityService`（讀+操作 UI）、`MediaProjection`（截圖）、`ForegroundService`（長駐）。
- 網路：OkHttp 輪詢（之後可換 WS）。
- 最低 API：建議 26+（前景服務行為）。

## 5. 分階段
- **A0** 骨架：Foreground Service + 配對 + 輪詢佇列 + `ui.read`/`screen.capture`（唯讀先行、最安全）。
- **A1** 操作：`ui.tap`/`ui.input`/`ui.swipe` + 本機確認 UI。
- **A2** 打磨：黑名單、可視化操作軌跡、Play 政策文件與影片、內測。
- **A3** 上架：Prominent Disclosure 審查、封閉測試 → 公開。

## 6. 風險（誠實）
- Play 對 AccessibilityService 審查嚴、可能被拒；需準備用途說明與示範影片。
- 各 App UI 差異大、無障礙標註不全 → `ui.read` 品質不穩，需 fallback 到截圖+視覺（成本高）。
- iOS 幾乎做不到同等能力（沙盒嚴），維持「iOS 只做手機遙控電腦」。

## 7. 與現有系統的接點清單（開工時照這個接）
- [ ] `agent_device_bridges.platform='android'` + capabilities 記 android 工具。
- [ ] Android 版工具註冊（不進 web 的 `tools.ts`；由 Android 端自報 capabilities，雲端據此允許）。
- [ ] `/agent` 配對彈窗加 QR（給手機掃）。
- [ ] orchestrator 選裝置時可指定 platform（跑手機任務 → 找 android 裝置）。
