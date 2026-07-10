#!/usr/bin/env node
// AI 島桌面助手 · Bridge 核心（Phase 1b）
// 輪詢雲端佇列 → 領取本機工具呼叫 → 依白名單執行 → 回填結果。
// 執行：node bridge.mjs   （設定讀 bridge.config.json 或環境變數 ISLAND_* ）
//
// 安全：
//  - 檔案操作限定 config.roots 底下；system.run_command 首個指令詞須在 config.commands 白名單。
//  - 高風險動作在雲端 /agent 已有「逐次確認」關卡；本機白名單是第二道防線。
//  - token 存在本機 config、只你自己有；隨時 Ctrl+C 停止（大顆停止鈕＝關掉這個程式）。
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CFG_PATH = process.env.ISLAND_CONFIG || path.join(HERE, "bridge.config.json");

function loadConfig() {
  let file = {};
  try { file = JSON.parse(fs.readFileSync(CFG_PATH, "utf8")); } catch { /* 無檔用 env */ }
  const cfg = {
    apiBase: process.env.ISLAND_API_BASE || file.apiBase || "https://ai-island-web.snowrealm.pet",
    token:   process.env.ISLAND_TOKEN   || file.token   || "",
    pollMs:  Number(process.env.ISLAND_POLL_MS || file.pollMs || 4000),
    roots:  (file.roots  || [process.cwd()]).map((r) => path.resolve(r)),
    commands: file.commands || ["npm", "npx", "pnpm", "yarn", "node", "git", "python", "python3", "pytest", "echo", "ls", "dir", "type", "cat"],
    maxOutput: Number(file.maxOutput || 20000),
    cmdTimeoutMs: Number(file.cmdTimeoutMs || 120000),
  };
  return cfg;
}

let CFG = loadConfig();
if (!CFG.token) {
  console.error("✗ 尚未設定裝置 token。請到 AI 島 /agent 點『連接桌面助手』取得 token，貼進 bridge.config.json 的 \"token\" 或設環境變數 ISLAND_TOKEN。");
  process.exit(1);
}

// ── 路徑白名單：解析後必須落在某個 root 底下 ──
function resolveInRoots(p) {
  if (!p) throw new Error("缺 path");
  const abs = path.resolve(p);
  const cmp = process.platform === "win32" ? (s) => s.toLowerCase() : (s) => s;
  const ok = CFG.roots.some((root) => {
    const r = cmp(root.endsWith(path.sep) ? root : root + path.sep);
    return cmp(abs) === cmp(root) || cmp(abs).startsWith(r);
  });
  if (!ok) throw new Error(`路徑不在允許範圍：${abs}（允許：${CFG.roots.join(", ")}）`);
  return abs;
}

function clip(s) { s = String(s ?? ""); return s.length > CFG.maxOutput ? s.slice(0, CFG.maxOutput) + `\n…（已截斷，共 ${s.length} 字）` : s; }

// ── 本機工具實作 ──
const HANDLERS = {
  "filesystem.list": async ({ path: p }) => {
    const abs = resolveInRoots(p);
    const entries = fs.readdirSync(abs, { withFileTypes: true }).slice(0, 500)
      .map((e) => ({ name: e.name, type: e.isDirectory() ? "dir" : "file" }));
    return { path: abs, entries };
  },
  "filesystem.read": async ({ path: p }) => {
    const abs = resolveInRoots(p);
    const stat = fs.statSync(abs);
    if (stat.size > 512 * 1024) throw new Error("檔案過大（>512KB），不讀");
    return { path: abs, content: clip(fs.readFileSync(abs, "utf8")) };
  },
  "filesystem.write": async ({ path: p, content }) => {
    const abs = resolveInRoots(p);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, String(content ?? ""), "utf8");
    return { path: abs, bytes: Buffer.byteLength(String(content ?? "")) };
  },
  "system.run_command": async ({ command, cwd }) => {
    const cmd = String(command ?? "").trim();
    if (!cmd) throw new Error("缺 command");
    const first = cmd.split(/\s+/)[0].replace(/\.(exe|cmd|bat)$/i, "");
    if (!CFG.commands.includes(first)) throw new Error(`指令 "${first}" 不在白名單（允許：${CFG.commands.join(", ")}）`);
    const runCwd = cwd ? resolveInRoots(cwd) : CFG.roots[0];
    return await new Promise((resolve) => {
      const child = spawn(cmd, { cwd: runCwd, shell: true });
      let out = "", err = "";
      const timer = setTimeout(() => { child.kill(); err += "\n（逾時，已中止）"; }, CFG.cmdTimeoutMs);
      child.stdout.on("data", (d) => { out += d; });
      child.stderr.on("data", (d) => { err += d; });
      child.on("close", (code) => { clearTimeout(timer); resolve({ command: cmd, cwd: runCwd, exitCode: code, stdout: clip(out), stderr: clip(err) }); });
      child.on("error", (e) => { clearTimeout(timer); resolve({ command: cmd, cwd: runCwd, exitCode: -1, stderr: String(e?.message ?? e) }); });
    });
  },
};

async function api(pathname, init) {
  const res = await fetch(CFG.apiBase + pathname, {
    ...init,
    headers: { Authorization: `Bearer ${CFG.token}`, "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`${pathname} → ${res.status} ${await res.text().catch(() => "")}`);
  return res.json();
}

async function handleCall(c) {
  const h = HANDLERS[c.tool];
  try {
    if (!h) throw new Error(`本機不支援工具 ${c.tool}`);
    const data = await h(c.args || {});
    await api("/api/agent/bridge/result", { method: "POST", body: JSON.stringify({ callId: c.id, ok: true, result: data }) });
    console.log(`  ✓ ${c.tool}`);
  } catch (e) {
    await api("/api/agent/bridge/result", { method: "POST", body: JSON.stringify({ callId: c.id, ok: false, result: { error: String(e?.message ?? e) } }) }).catch(() => {});
    console.log(`  ✗ ${c.tool}: ${e?.message ?? e}`);
  }
}

let running = true;
process.on("SIGINT", () => { console.log("\n■ 停止桌面助手。"); running = false; process.exit(0); });

console.log(`● AI 島桌面助手已啟動 · ${os.hostname()}`);
console.log(`  雲端：${CFG.apiBase}`);
console.log(`  允許資料夾：${CFG.roots.join(", ")}`);
console.log(`  白名單指令：${CFG.commands.join(", ")}`);
console.log("  等待任務中…（Ctrl+C 停止）\n");

while (running) {
  try {
    const { calls } = await api("/api/agent/bridge/poll", { method: "GET" });
    for (const c of calls || []) { console.log(`▶ 領到：${c.tool} ${JSON.stringify(c.args)}`); await handleCall(c); }
  } catch (e) {
    console.error("  輪詢失敗：", e?.message ?? e);
  }
  await new Promise((r) => setTimeout(r, CFG.pollMs));
}
