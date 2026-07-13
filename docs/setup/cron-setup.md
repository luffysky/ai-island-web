# Cron-job.org 設定清單

## 適用情境
- cron-job.org **免費版**（不能加 custom header）→ 全部用 `?secret=` query
- Zeabur Cron Jobs / GitHub Actions / 付費 cron 服務 → 可改用 `Authorization: Bearer` header

---

## 共用變數

| 變數 | 從哪拿 |
|---|---|
| `<SITE>` | `https://ai-island-web.snowrealm.pet` |
| `<SECRET>` | Zeabur env 的 `CRON_SECRET` 值（32 字元 hex） |

---

## 8 個 cron job 完整清單

### 1. keep-warm（**最重要**、防 Discord interaction 冷啟動）

| | |
|---|---|
| URL | `<SITE>/api/cron/keep-warm?secret=<SECRET>` |
| Method | GET |
| Schedule | **每 4 分鐘**（cron-job.org: `*/4 * * * *`） |
| Notification | 建議關閉、否則每 4 分鐘 success 通知會塞爆 |

> ⚠️ 這個沒跑、Discord bot 用戶下指令會 cold start > 3 秒、Discord 顯示「interaction failed」

### 2. anomaly-check（異常偵測）

| | |
|---|---|
| URL | `<SITE>/api/cron/anomaly-check?secret=<SECRET>` |
| Method | GET |
| Schedule | **每 30 分鐘** |

### 3. ga4-sync（GA4 報表同步）

| | |
|---|---|
| URL | `<SITE>/api/admin/ga4/sync?secret=<SECRET>` |
| Method | GET |
| Schedule | **每天 01:00 台灣時間**（cron-job.org UTC：`0 17 * * *`） |
| 前置 | Zeabur env 必須有 `GA4_PROPERTY_ID` + `GA4_SA_CREDENTIALS`、否則回 503 |

### 4. kpi-email（每日 KPI 報表 email）

| | |
|---|---|
| URL | `<SITE>/api/cron/kpi-email?period=daily&secret=<SECRET>` |
| Method | GET |
| Schedule | **每天 09:00 台灣時間**（UTC：`0 1 * * *`） |
| 前置 | Zeabur env 必須有 `RESEND_API_KEY` + `ADMIN_EMAILS` + `EMAIL_FROM`、否則靜默 skip |

### 5. line-daily（每日 LINE 報表）

| | |
|---|---|
| URL | `<SITE>/api/cron/line-daily?period=daily&secret=<SECRET>` |
| Method | GET |
| Schedule | **每天 09:00 台灣時間**（UTC：`0 1 * * *`） |

### 6. student-daily-review（學員 20:00 LINE 推播）

| | |
|---|---|
| URL | `<SITE>/api/cron/student-daily-review?secret=<SECRET>` |
| Method | GET |
| Schedule | **每天 20:00 台灣時間**（UTC：`0 12 * * *`） |
| Timeout | 設高一點（90 秒）— 推一群人會慢 |

### 7. agent-schedules（AI 員工辦公室排程自動跑）

| | |
|---|---|
| URL | `<SITE>/api/cron/agent-schedules?secret=<SECRET>` |
| Method | GET |
| Schedule | **每 15 分鐘**（cron-job.org: `*/15 * * * *`） |
| 說明 | 撈使用者在 `/agent/office` 設的「已啟用且到期」排程、每條發起一個 agent 背景任務。排程時間是**台灣時間**、整點觸發（15 分粒度足夠）。 |
| 紅線 | 排程只「發起任務」；任務內若要對外（發文/報名）仍走 `awaiting_approval` 待使用者批准，**不會自動對外**。 |
| Timeout | 60–90 秒（一次最多處理 15 條、每條只是啟動背景任務） |

### 8. opportunity-deadlines（機會島截止提醒）

| | |
|---|---|
| URL | `<SITE>/api/cron/opportunity-deadlines?secret=<SECRET>` |
| Method | GET |
| Schedule | **每天一次**（建議台灣 09:00 → UTC `0 1 * * *`） |
| 說明 | 掃使用者「我的航線」收藏的機會，距報名截止 30/14/7/3/1 天時發 in-app 鈴鐺 + LINE（綁定才送）。同機會 20h 內只通知一次。 |
| Timeout | 90 秒 |

---

## cron-job.org 自動停用設定

每個 job 建議調整：

| 設定項 | 建議值 |
|---|---|
| **Notifications → Notify on failure** | 開（出事才告訴你） |
| **Notifications → Disable on failure** | **5 次連續失敗 → 關掉**（避免一次抖動就被永久停用） |
| **Treat redirects as success** | 開 |
| **Save responses** | 開（之後 debug 方便） |
| **Timeout** | 30 秒（line-daily / student-daily-review 設 90 秒） |

---

## 為什麼之前被自動停用

`keep-warm` 之前 URL 沒帶 `?secret=`、endpoint 回 401、累積失敗超過閾值 → cron-job.org 自動 disable。

修法：URL 改成 `<SITE>/api/cron/keep-warm?secret=<SECRET>` 重新 enable 即可。

---

## 進階：改用 Bearer header（付費版 / Zeabur Cron）

如果用 cron-job.org **付費版** 或 **Zeabur Cron Jobs**、可改用 header 認證（URL 不帶 secret 較乾淨）：

| Header 名 | 值 |
|---|---|
| `Authorization` | `Bearer <SECRET>` |
| 或 `x-cron-secret` | `<SECRET>` |

8 個 endpoint 全部都同時支援這三種認證方式（query / Bearer / x-cron-secret）、選一種用即可。
