# GA4 整合設定手冊

## 為什麼要設這個

讓 AI 島後台可以**自動同步 Google Analytics 4 資料**、顯示在 Dashboard。
這樣不用每天開 GA 頁面看流量、後台一頁看完。

**沒設不會壞**——只是後台 GA4 區塊顯示「未設定」。其他功能不影響。

---

## 整體流程

```
1. 開啟 Google Analytics Data API（雲端服務）
2. 建立 Service Account（機器人帳號）
3. 給 SA 在 GA4 屬性內 Viewer 權限
4. 下載 SA 的 JSON 金鑰
5. 在 Zeabur 設兩個環境變數
6. Redeploy
```

---

## Step 1：開啟 API

1. 開 https://console.cloud.google.com/
2. 上方點專案下拉、選你的專案（沒專案就建一個、名稱隨意）
3. 左邊選單 → **APIs & Services → Library**
4. 搜尋 `Google Analytics Data API`
5. 點進去、按 **ENABLE**

---

## Step 2：建 Service Account

1. 左邊選單 → **IAM & Admin → Service Accounts**
2. 點上方 **+ CREATE SERVICE ACCOUNT**
3. 填：
   - Service account name：`ai-island-ga4-reader`
   - Service account ID：自動產生
   - Description：`GA4 sync for AI Island admin dashboard`
4. **CREATE AND CONTINUE**
5. **Role 不用選**（這個 SA 不用任何 GCP 權限、權限在 GA4 那邊給）
6. **CONTINUE → DONE**

---

## Step 3：下載 JSON 金鑰

1. SA 清單內、找到剛建的 `ai-island-ga4-reader@xxx.iam.gserviceaccount.com`
2. 點進去 → 上方 tab 切到 **KEYS**
3. **ADD KEY → Create new key**
4. 選 **JSON** → CREATE
5. 自動下載一個 `.json` 檔（**這個檔就是金鑰、別丟、別公開**）

打開 JSON 看一下、大概長這樣：

```json
{
  "type": "service_account",
  "project_id": "your-project-123456",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "ai-island-ga4-reader@your-project-123456.iam.gserviceaccount.com",
  ...
}
```

記住 `client_email`、下一步要用。

---

## Step 4：在 GA4 加 Service Account 為 Viewer

1. 開 https://analytics.google.com/
2. 左下角 **齒輪⚙️** → Admin
3. 中間欄位 **Property** → **Property access management**
4. 右上角 **+** → **Add users**
5. Email 貼 SA 的 `client_email`（例：`ai-island-ga4-reader@xxx.iam.gserviceaccount.com`）
6. 取消 **Notify by email** 的勾（SA 不收信）
7. Role 選 **Viewer**
8. 右上 **Add**

---

## Step 5：找你的 Property ID

1. GA4 → Admin
2. 中間欄位 **Property settings**
3. 右上看 **PROPERTY ID**、複製（純數字、9-10 位、例 `123456789`）

---

## Step 6：Zeabur 設環境變數

開 Zeabur 專案 → Service → Environment Variables、加兩個：

### `GA4_PROPERTY_ID`
```
123456789
```
（你剛複製的純數字）

### `GA4_SA_CREDENTIALS`
**整段 JSON 貼進去**、不要修改任何字元、不要加單雙引號。

```
{"type":"service_account","project_id":"your-project-123456","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"ai-island-ga4-reader@xxx.iam.gserviceaccount.com",...}
```

> ⚠️ **重要**：JSON 內的 `\n` 必須保留、不要展開成真正換行。Zeabur env input 支援多行、所以可以複製貼上整段 JSON 完整保留。

---

## Step 7：CRON_SECRET（給每天自動同步用）

順便建一個 cron secret（隨機字串、別人猜不到）：

```bash
node scripts/generate-secrets.js
```

選 `CRON_SECRET` 那行的值、加到 Zeabur env：

### `CRON_SECRET`
```
你產的 32 字元 hex
```

---

## Step 8：在 Zeabur 設 Cron Job

Zeabur Dashboard → 你的 service → **Cron Jobs** → **+ Add**

```yaml
Name:     ga4-daily-sync
Schedule: 0 1 * * *           # 每天凌晨 1 點
Command:  curl -H "x-cron-secret: $CRON_SECRET" https://ai-island-web.snowrealm.pet/api/admin/ga4/sync
```

---

## Step 9：Redeploy + 測試

1. Redeploy（Zeabur 一般自動）
2. 開後台 → **GA4 整合**
3. 不再顯示「未設定」
4. 按「立即同步」、應該跑出最近 30 天資料

---

## 常見問題

### Q: SA 加進去但跑不出資料、報 PERMISSION_DENIED
**A**: 確認你是加在 **Property 層級**、不是 Account 層級。Account access management ≠ Property access management。

### Q: 報 INVALID_ARGUMENT property
**A**: 你的 `GA4_PROPERTY_ID` 是 GA4 編號、不是「測量 ID」（G-XXXXXX）也不是 Universal Analytics 編號（UA-XXXXX-X）。要純 9-10 位數字。

### Q: 同步沒反應
**A**: F12 Network 看 `/api/admin/ga4/sync` 回什麼。可能：
- 401 → 你不是 admin
- 503 → CRON_SECRET 未設（你是用 POST 從後台按、應該不會 503）
- 500 + JSON parse error → `GA4_SA_CREDENTIALS` 格式錯
- 500 + invalid_grant → `private_key` 內的 `\n` 被吃掉了

### Q: 一天同步幾次比較好
**A**: 每天 1 次就夠（凌晨 1 點）。GA4 資料延遲 24-48 小時、太頻繁同步沒意義且浪費 API quota。

---

## 安全提醒

- **JSON 金鑰 = SA 的密碼**、洩漏就要立刻 revoke
- 不要 commit 進 Git
- 不要貼到 Discord / Slack / 截圖
- 萬一洩漏：Google Cloud → SA → Keys → 刪掉那個 key → 建新的

---

## 完成後你能看到

後台 Dashboard 會多一個 **GA4 整合** 區塊：
- 👥 30 日活躍訪客
- 📊 流量來源 pie chart
- 📈 每日 sessions 趨勢
- 📱 裝置分布
- 🌍 國家分布
- 🔥 熱門頁面 top 10
