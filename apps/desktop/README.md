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

## 圖形介面（開發時預覽）
```bash
npm install          # 裝 electron
npm run gui          # 系統匣 + 設定畫面（貼 token / 選資料夾）+ 啟停
```

## 打包給一般使用者（免裝 Node）
```bash
cd apps/desktop
npm install                 # 含 electron + electron-builder（devDependencies）
```
兩種產物：

**A. 免安裝 zip / 綠色版（最穩、不需特殊權限）**
```bash
npm run dist:dir                                  # 產出 dist/win-unpacked/（可直接跑的 App）
npx electron-builder --win zip --prepackaged dist/win-unpacked   # 打包成 zip
# 產物：dist/AI島桌面助手-0.1.0-win.zip → 解壓 → 雙擊「AI島桌面助手.exe」→ 免裝 Node
```

**B. NSIS 安裝檔（雙擊安裝、桌面捷徑）**
```bash
npm run dist                # 產出 dist/AI島桌面助手 Setup 0.1.0.exe
```
> ⚠️ **NSIS 需 Windows「開發人員模式」開啟**（設定 → 隱私權與安全性 → 開發人員選項 → 開發人員模式 = 開），
> 否則 electron-builder 解壓 winCodeSign 快取時會因「無法建立符號連結」失敗（macOS 的 .dylib symlink）。
> 開了之後 `npm run dist` 就會成功；或用上面的 zip 版避開此問題。

共通：
- **免裝 Node**：bridge 邏輯（`bridge-core.mjs`）在 Electron 主行程內跑。
- 設定存 `%APPDATA%/AI島桌面助手/bridge.config.json`，**GUI 填 token、按「新增資料夾」選允許目錄**，不用手改 JSON。
- 圖示：預設 Electron 圖示；自訂放 `build/icon.ico` 重打包。
- 瀏覽器工具（Playwright）不含在包裡（保持精簡）；需要再用開發者 CLI 版另裝。

## 支援的本機工具
| 工具 | 風險 | 說明 |
|---|---|---|
| `filesystem.list` | read | 列資料夾（限 roots） |
| `filesystem.read` | read | 讀文字檔（限 roots、≤512KB） |
| `filesystem.write` | write | 寫檔（限 roots、雲端需確認） |
| `system.run_command` | dangerous | 跑白名單指令（雲端強制確認） |
| `browser.open` | read | 用瀏覽器開網址、回標題+文字（需 Playwright） |
| `browser.click` / `browser.type` | write | 點擊/輸入頁面元素（需確認） |
| `browser.screenshot` | read | 截目前頁面回傳圖片 |

**啟用瀏覽器工具**（Playwright 是選用相依）：
```bash
cd apps/desktop
npm install playwright
npx playwright install chromium
```
之後 `browser.*` 就會用一個非 headless 的 Chromium 執行（看得到它在動）。
