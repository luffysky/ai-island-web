# AI 島桌面助手（Bridge）— Phase 1b

讓 AI 島 `/agent` 的行動代理能在**你的電腦上**做事：列/讀/寫檔案、跑白名單指令（如 `npm test`）。
不架長駐連線——桌面助手**主動輪詢**雲端佇列，領到任務才執行，隨時 Ctrl+C 停止。

## 安全設計（重要）
- **檔案操作只限 `roots` 底下**的資料夾；越界直接拒絕。
- **`system.run_command` 首個指令詞須在 `commands` 白名單**（預設只有 npm/npx/node/git/python/pytest… 等）。
- **寫入 / 高風險動作在雲端 `/agent` 已有「逐次人工確認」**；本機白名單是第二道防線。
- **token 只存在你本機 `bridge.config.json`**（已被 `.gitignore`）；解除配對到 `/agent` 撤銷即失效。
- 桌面助手要你**自己啟動**才會運作；關掉程式＝完全停止。

## 快速開始（純 CLI、零安裝）
只需要 Node 18+（內建 `fetch`）。

1. 到 AI 島 `/agent` →「連接桌面助手」→ 產生並複製 token（`isb_...`，只顯示一次）。
2. 複製設定檔並填入：
   ```bash
   cp bridge.config.example.json bridge.config.json
   # 編輯 bridge.config.json：貼上 token、把 roots 改成你要開放的專案資料夾
   # ⚠ Windows 路徑用正斜線（D:/foo/bar）或雙反斜線（D:\\foo\\bar）；單反斜線會讓 JSON 壞掉
   ```
3. 啟動：
   ```bash
   node bridge.mjs
   ```
   看到「等待任務中…」就成功了。回 `/agent` 下需要本機的指令（例：「幫我在專案跑 npm test 並看結果」），桌面助手會領走、執行、把結果回傳給 Agent。

也可用環境變數取代設定檔：`ISLAND_TOKEN`、`ISLAND_API_BASE`、`ISLAND_CONFIG`。

## 圖形介面（選用）
```bash
npm install          # 裝 electron（optional dep）
npm run gui          # 系統匣 + 狀態視窗 + 大顆停止鈕
```

## 支援的本機工具
| 工具 | 風險 | 說明 |
|---|---|---|
| `filesystem.list` | read | 列資料夾（限 roots） |
| `filesystem.read` | read | 讀文字檔（限 roots、≤512KB） |
| `filesystem.write` | write | 寫檔（限 roots、雲端需確認） |
| `system.run_command` | dangerous | 跑白名單指令（雲端強制確認） |

> `browser.*`（Playwright）預留給後續：裝了 `playwright` 後補上獨立 Chromium 的 DOM/Role 定位。
