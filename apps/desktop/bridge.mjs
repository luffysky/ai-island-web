#!/usr/bin/env node
// AI 島桌面助手 · CLI 入口。設定讀 bridge.config.json（或環境變數 ISLAND_*）。
// 一般使用者請改用安裝版 GUI（npm run gui / 安裝檔）；此為開發者 CLI。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createBridge } from "./bridge-core.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CFG_PATH = process.env.ISLAND_CONFIG || path.join(HERE, "bridge.config.json");

let file = {};
try { file = JSON.parse(fs.readFileSync(CFG_PATH, "utf8")); } catch { /* 無檔用 env */ }
const config = {
  apiBase: process.env.ISLAND_API_BASE || file.apiBase,
  token: process.env.ISLAND_TOKEN || file.token,
  pollMs: process.env.ISLAND_POLL_MS || file.pollMs,
  roots: file.roots,
  commands: file.commands,
  maxOutput: file.maxOutput,
  cmdTimeoutMs: file.cmdTimeoutMs,
};

if (!config.token) {
  console.error("✗ 尚未設定裝置 token。到 AI 島 /agent『連接桌面助手』取得 token，貼進 bridge.config.json 的 \"token\"（或設 ISLAND_TOKEN）。");
  process.exit(1);
}

const bridge = createBridge({ config, onLog: (s) => console.log(s) });
process.on("SIGINT", async () => { await bridge.stop(); process.exit(0); });
console.log("● AI 島桌面助手（CLI）— Ctrl+C 停止");
bridge.start();
