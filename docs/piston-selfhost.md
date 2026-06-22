# 自架 Piston（程式碼沙盒）

> ⚙️ **目前狀態（2026-06）**：沙盒預設用 **Wandbox**（免費免 key、已可用）。
> 自架 Piston 屬「**選配的加速 / 備援**」。一旦設了 `PISTON_BASE_URL`：
> **Piston 為主、Wandbox 為備**（Piston 掛掉 / 某語言沒裝 / 9 秒沒回 → 自動退回 Wandbox）。
> 不設則純用 Wandbox。回應的 `via` 欄位會標明這次是哪個後端執行的。

## 為什麼要自架

`/api/playground/run` 用 [Piston](https://github.com/engineer-man/piston) 跑 30+ 語言程式碼（Python 已用 Pyodide、其他語言走 Piston）。

預設指向公用版 `emkc.org/api/v2/piston`，限制：
- **5 requests/sec**：學員一多就被擋
- **共享資源**：別人燒 CPU 你的請求變慢
- **偶爾掛掉**：他們不保 SLA
- **不能裝 pip / npm 套件**：固定環境

自架版：
- 無 rate limit（你自己決定）
- 獨立 CPU
- 99.9% uptime（你的 Zeabur）
- 可裝額外 runtime（Node 20 + Bun + Deno）

## 部署到 Zeabur（推薦）

### 1. 新建 Zeabur 服務
- 登入 [Zeabur Dashboard](https://dash.zeabur.com)
- 「新建服務」→ 選「Docker Image」
- Image: `ghcr.io/engineer-man/piston`（官方映像）
- Tag: `latest`

### 2. 環境變數
```
PISTON_BIND_ADDR=0.0.0.0:2000
PISTON_RUN_TIMEOUT=10000
PISTON_COMPILE_TIMEOUT=20000
PISTON_DISABLE_NETWORKING=true   # 沙盒禁網路、防 SSRF
```

### 3. 開 port
- Network → Public → 開放 port `2000`
- 拿到你的 endpoint URL：例如 `https://piston-yourname.zeabur.app`

### 4. 裝語言 runtime（首次部署、跑一次）

Zeabur Console 進去執行：
```bash
# 列可裝的
curl http://localhost:2000/api/v2/packages

# 裝常用 10 個（about 2GB disk）
for lang in python:3.10.0 javascript:18.15.0 typescript:5.0.3 \
           go:1.16.2 rust:1.68.2 java:15.0.2 c:10.2.0 cpp:10.2.0 \
           ruby:3.0.1 php:8.2.3; do
  curl -X POST http://localhost:2000/api/v2/packages \
    -H "Content-Type: application/json" \
    -d "{\"language\":\"${lang%:*}\",\"version\":\"${lang#*:}\"}"
done
```

### 5. 連 AI 島
在 AI 島的 Zeabur 服務環境變數加：
```
PISTON_BASE_URL=https://piston-yourname.zeabur.app/api/v2/piston
```
（注意：要含 `/api/v2/piston`、`/api/playground/run/route.ts` 會自動加 `/execute`）

### 5b.（選）用自己的網域、不要 zeabur.app
**可以**。`PISTON_BASE_URL` 填什麼網域都行、code 只是對它發 fetch。步驟：
1. Piston 服務 → Zeabur **Networking → Domains → Add Domain**，填子網域、例如 `piston.snowrealm.pet`。
2. 到你的 DNS（Cloudflare 等）照 Zeabur 給的指示加 **CNAME**（指到 Zeabur 提供的目標）。
   - 用 Cloudflare 的話、那筆 CNAME 建議設 **DNS only（灰雲、不要開橘色 proxy）**；開 proxy 有時會擋非標準路徑/逾時。
3. 等憑證簽好（Zeabur 自動）、之後 env 改填：
```
PISTON_BASE_URL=https://piston.snowrealm.pet/api/v2/piston
```
> 一樣要含 `/api/v2/piston`、結尾**不要**加斜線（code 會自己接 `/execute`）。
> 不論 `*.zeabur.app` 或自訂網域、行為完全一樣。

### 6. 驗證
- 後台進任一章節 playground、跑 Go / Rust hello world、應該回應 < 2 秒。
- 看 `/api/playground/run` 回應的 `"via"`：是 `"piston"` 代表走自架、`"wandbox"` 代表退回備援。
- 也可直接打 `https://你的網域/api/v2/piston/runtimes`、能列出已裝語言就代表通了。

## 替代方案

### Docker Compose（本機 / VPS）
```yaml
# docker-compose.yml
services:
  piston:
    image: ghcr.io/engineer-man/piston
    container_name: piston
    restart: always
    ports:
      - "2000:2000"
    tmpfs:
      - /piston/jobs
    environment:
      PISTON_DISABLE_NETWORKING: "true"
      PISTON_RUN_TIMEOUT: "10000"
    volumes:
      - piston_data:/piston

volumes:
  piston_data:
```

```bash
docker compose up -d
# 裝 runtime（同上）
```

### Railway
類似 Zeabur、直接 import GitHub 上 piston 官方 repo、deploy。

### Self-host on Hetzner / Linode
1 個 2vCPU / 4GB RAM 機器（~€5/月）綽綽有餘。docker 一鍵裝。

## 成本對比

| 方案 | 月成本 | rate limit | uptime |
|---|---|---|---|
| 公用 emkc.org | $0 | 5 req/s | ~95% |
| Zeabur Hobby | $5 | 自己決定 | ~99% |
| Hetzner CX22 | €5 | 自己決定 | ~99.9% |

## Troubleshooting

- **語言 not installed**：跑第 4 步裝 runtime
- **timeout 跳出**：調 `PISTON_RUN_TIMEOUT`、預設 3000ms 太短
- **記憶體不足**：升 Zeabur tier、或限制 `PISTON_RUN_MEMORY_LIMIT`
- **沙盒逃逸風險**：`PISTON_DISABLE_NETWORKING=true` 必設、別讓學員的 code 連外網

## 監控

Piston 沒內建 metrics。建議：
- Zeabur 看 CPU / RAM 用量
- /api/playground/run 失敗時寫 error_logs、靠 admin LINE bot 通知
