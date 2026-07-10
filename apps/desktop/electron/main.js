// AI 島桌面助手 — Electron 外殼（打包版）。
// bridge 邏輯在主行程內跑（動態 import ESM 的 bridge-core.mjs）；設定存 userData、GUI 可編輯。
const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, nativeImage } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

let win = null, tray = null, bridge = null;
const CFG_PATH = () => path.join(app.getPath("userData"), "bridge.config.json");
const CORE = path.join(__dirname, "..", "bridge-core.mjs");
const ICON = path.join(__dirname, "..", "build", "icon.png");   // 執行時的視窗/工作列/系統匣圖示

function loadCfg() {
  try { return JSON.parse(fs.readFileSync(CFG_PATH(), "utf8")); }
  catch { return { apiBase: "https://ai-island-web.snowrealm.pet", token: "", roots: [], commands: ["npm", "npx", "pnpm", "yarn", "node", "git", "python", "python3", "pytest", "echo", "ls", "dir", "type", "cat"] }; }
}
function saveCfg(cfg) { fs.writeFileSync(CFG_PATH(), JSON.stringify(cfg, null, 2), "utf8"); }

function send(ch, v) { if (win && !win.isDestroyed()) win.webContents.send(ch, v); }
function setState(on) { send("state", on); tray?.setToolTip(on ? "AI 島桌面助手 · 執行中" : "AI 島桌面助手 · 已停止"); }

async function startBridge() {
  if (bridge) return;
  const cfg = loadCfg();
  if (!cfg.token) { send("log", "⚠ 尚未填裝置 token，請到設定貼上。\n"); return; }
  const { createBridge } = await import(`file://${CORE.replace(/\\/g, "/")}`);
  bridge = createBridge({ config: cfg, onLog: (s) => send("log", s + "\n") });
  try { bridge.start(); setState(true); }
  catch (e) { send("log", "⚠ " + (e?.message ?? e) + "\n"); bridge = null; }
}
async function stopBridge() { if (bridge) { await bridge.stop(); bridge = null; } setState(false); }

function createWindow() {
  win = new BrowserWindow({
    width: 620, height: 720, title: "AI 島桌面助手",
    icon: ICON,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true },
  });
  win.loadFile(path.join(__dirname, "renderer", "index.html"));
  win.on("close", (e) => { if (!app.isQuiting) { e.preventDefault(); win.hide(); } });
}

app.whenReady().then(() => {
  createWindow();
  let trayImg = nativeImage.createFromPath(ICON);
  if (!trayImg.isEmpty()) trayImg = trayImg.resize({ width: 16, height: 16 });
  else trayImg = nativeImage.createEmpty();
  tray = new Tray(trayImg);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "顯示視窗", click: () => win.show() },
    { label: "啟動", click: startBridge },
    { label: "停止", click: stopBridge },
    { type: "separator" },
    { label: "結束", click: async () => { app.isQuiting = true; await stopBridge(); app.quit(); } },
  ]));
  tray.setToolTip("AI 島桌面助手 · 已停止");
});

ipcMain.handle("get-config", () => loadCfg());
ipcMain.handle("save-config", (_e, cfg) => { saveCfg(cfg); return true; });
ipcMain.handle("pick-folder", async () => {
  const r = await dialog.showOpenDialog(win, { properties: ["openDirectory"] });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle("start", startBridge);
ipcMain.handle("stop", stopBridge);
app.on("window-all-closed", () => { /* 常駐系統匣 */ });
