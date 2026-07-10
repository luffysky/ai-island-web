// AI 島桌面助手 — Electron 外殼：系統匣 + 狀態視窗 + 啟動/停止。
// 功能核心沿用 bridge.mjs（以子行程執行、串流輸出到視窗），GUI 只管開關與可視化。
const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } = require("electron");
const { spawn } = require("node:child_process");
const path = require("node:path");

let win = null, tray = null, child = null;
const BRIDGE = path.join(__dirname, "..", "bridge.mjs");

function send(line) { if (win && !win.isDestroyed()) win.webContents.send("log", line); }
function setState(running) { if (win && !win.isDestroyed()) win.webContents.send("state", running); tray?.setToolTip(running ? "AI 島桌面助手 · 執行中" : "AI 島桌面助手 · 已停止"); }

function startBridge() {
  if (child) return;
  child = spawn(process.execPath, [BRIDGE], { cwd: path.join(__dirname, ".."), env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" } });
  child.stdout.on("data", (d) => send(String(d)));
  child.stderr.on("data", (d) => send("⚠ " + String(d)));
  child.on("close", (code) => { send(`\n■ 已停止（code ${code}）`); child = null; setState(false); });
  setState(true);
}
function stopBridge() { if (child) { child.kill(); child = null; } setState(false); }

function createWindow() {
  win = new BrowserWindow({
    width: 560, height: 620, title: "AI 島桌面助手",
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true },
  });
  win.loadFile(path.join(__dirname, "renderer", "index.html"));
  win.on("close", (e) => { if (!app.isQuiting) { e.preventDefault(); win.hide(); } });
}

app.whenReady().then(() => {
  createWindow();
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "顯示視窗", click: () => win.show() },
    { label: "啟動", click: startBridge },
    { label: "停止", click: stopBridge },
    { type: "separator" },
    { label: "結束", click: () => { app.isQuiting = true; stopBridge(); app.quit(); } },
  ]));
  tray.setToolTip("AI 島桌面助手 · 已停止");
});

ipcMain.handle("start", () => { startBridge(); return true; });
ipcMain.handle("stop", () => { stopBridge(); return true; });
app.on("window-all-closed", () => { /* 常駐系統匣、不退出 */ });
