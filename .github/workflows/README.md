# GitHub Actions — 排程 cron

兩個 workflow 都是 cron schedule、由 GitHub Actions 免費額度跑。

| Workflow | 頻率 | 用途 |
|---|---|---|
| `anomaly-check.yml` | 每 30 分鐘 | 異常偵測（錯誤激增 / 訂單下降 / 工單積壓 / 流量斷崖）有事推 LINE |
| `line-daily.yml` | 台灣 09:00 + 22:00 | 每日 KPI 早報 / 週報 推 LINE |

---

## 林董一次性設定步驟

### 1. 加 GitHub Secrets

打開 GitHub repo → `Settings` → `Secrets and variables` → `Actions` → `New repository secret`

加 **兩個** secret：

| Name | Value |
|---|---|
| `SITE_URL` | 線上網址、例如 `https://web.snowrealm.pet`（**不要結尾 slash**） |
| `CRON_SECRET` | 跟 Zeabur 上的 `CRON_SECRET` 一模一樣（從 `.env.local` 複製） |

### 2. 確認 Zeabur 也有 `CRON_SECRET`

線上 endpoint 用這個 secret 驗證。Zeabur dashboard → service → Variables 加 `CRON_SECRET`（值跟 GitHub Secret 同一個）。

### 3. 手動觸發測試

GitHub repo → `Actions` → 選 `Anomaly Check` → `Run workflow` →
看 log 應該顯示 `HTTP 200` + `{ok:true, count:0, pushed:false}` 表示通了但沒異常。

### 4. 之後自動跑

workflow 一推到 main 分支就會生效、不必再設定。

---

## 注意事項

- GitHub Actions schedule **可能延遲 1-5 分鐘**（高 load 時）、能接受
- 30 分鐘 + 每日 2 次推 = 一個月約 1500 個 minute、遠在免費額度（2000 minute/月）內
- 想關掉某個 workflow → 直接刪這個 yaml 或在 GitHub Actions UI disable
- 想改頻率 → 編輯 yaml 的 `cron:` 行（用 [crontab.guru](https://crontab.guru/) 算）
