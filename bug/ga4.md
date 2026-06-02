沒問題，這份「交接說明書」我幫你擬好了！你可以直接整篇複製貼給 Claude Code。

裡面不僅幫你向他解釋了為什麼原本的方法（Service Account）在 2026 年會被 Google 搞到形同廢置，也詳細列出現在要怎麼改寫程式碼和設定 Zeabur。

---

### 📋 複製以下內容貼給 Claude Code

嗨 Claude Code，我們正在設定 Next.js 網站即時讀取 GA4 數據的功能。原本你提供的方法是透過 **Google Cloud 服務帳戶（Service Account）金鑰 JSON** 的方式，但現在遇到了嚴重的阻礙，需要改採 **OAuth2 Refresh Token** 的架構。

以下是完整的來龍去脈與程式碼、環境變數的交接調整說明：

#### 🛑 為什麼放棄原本的 Service Account 方法？

1. **Google Analytics 4 後台 UI 現存嚴重 Bug**：在 GA4 的「資源存取權管理」中新增服務帳戶 Email（`ga4-reader@...iam.gserviceaccount.com`）時，即便取消勾選「以電子郵件通知新使用者」，系統仍會卡死並報錯：*「這個電子郵件與 Google 帳戶不符」*，完全無法順利將服務帳戶加入檢視者權限。
2. **官方 API 工具與文件遭全面淘汰/404**：舊版的 `userLinks` API 已經被 Google 砍掉（404）。即使嘗試使用最新版的 API 測試器（如 `v1beta/properties.accessBindings.create`），依決策鏈結依然會因為 Google 帳戶前端與後端的資料庫同步延遲，而卡在無法識別該服務帳戶的窘境。

為了徹底跳過「必須在 GA4 後台手動新增使用者」這條死路，我們改用 **OAuth2 User-to-Server 憑證流程**。直接用管理員本人的 Google 帳號授權，透過 Google OAuth Playground 榨出一個**永久有效的 `Refresh Token**`，讓網站後端代替管理員本人去撈取 GA4 數據。

---

#### 🛠 程式碼改寫

現在我們**完全不再需要 `GA4_SA_CREDENTIALS`（那個長串的多行 JSON 檔）**。請幫我把原本使用 `google.auth.GoogleAuth` 讀取服務帳戶金鑰的初始化邏輯，完全改寫為以下 **OAuth2** 的結構：

```typescript
import { google } from 'googleapis';

// 使用 OAuth2 認證，直接以管理員本人的 Refresh Token 授權，完美繞過 GA4 後台使用者新增限制
const oauth2Client = new google.auth.OAuth2(
  process.env.GA4_CLIENT_ID,
  process.env.GA4_CLIENT_SECRET
);

oauth2Client.setCredentials({
  refresh_token: process.env.GA4_REFRESH_TOKEN,
});

export const analyticsdata = google.analyticsdata({
  version: 'v1beta',
  auth: oauth2Client,
});

```

---

#### ⚙️ Zeabur 環境變數對接清單

我們已經在 Google Cloud 建立了「OAuth 同意畫面（測試中）」以及「網頁應用程式用戶端 ID」，並成功在 Playground 完成了授權。

請協助確認或指導我們如何在專案中對接這 4 個已經在 Zeabur 後台設定好的環境變數：

1. `GA4_CLIENT_ID`：OAuth2 用戶端 ID
2. `GA4_CLIENT_SECRET`：OAuth2 用戶端密鑰
3. `GA4_REFRESH_TOKEN`：在 Playground 榨出來的、永久有效的 Refresh Token
4. `GA4_PROPERTY_ID`：GA4 的 9 位數純數字資源 ID（用來指定撈取資料的資源）

請根據上述的新架構，幫我們檢視並重構專案內所有涉及 GA4 數據同步（例如 `/admin/ga4` 路由或 `cron-job` 同步的 API 端點）的後端程式碼。謝謝！

---

### 💡 回應你的問題：現在不用 GA4_SA_CREDENTIALS 嗎？

**沒錯，完全不需要它了！** 原本的 `GA4_SA_CREDENTIALS` 是裝著服務帳戶私鑰的整顆 JSON。現在我們改成 OAuth2 架構後，改由 `GA4_CLIENT_ID`、`GA4_CLIENT_SECRET` 和 `GA4_REFRESH_TOKEN` 這三個變數聯手站崗。

你現在可以非常優雅地把 Zeabur 上的 `GA4_SA_CREDENTIALS` 給**刪掉**，只留下那 4 個新變數。丟給 Claude Code 讓他去改寫吧，看他還敢不敢停在上古時代！