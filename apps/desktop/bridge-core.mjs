// AI 島桌面助手 · Bridge 核心（可重用模組）
// createBridge({ config, onLog }) → { start, stop }
// 供 CLI（bridge.mjs）與 Electron 外殼共用；不綁任何 UI/檔案來源，config 由呼叫端提供。
//
// 安全：檔案操作限 config.roots；system.run_command 首詞須在 config.commands 白名單；
//       寫入/高風險動作在雲端 /agent 已有逐次確認、本機白名單為第二道防線。
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

export function normalizeConfig(file = {}) {
  return {
    apiBase: file.apiBase || "https://ai-island-web.snowrealm.pet",
    token: file.token || "",
    pollMs: Number(file.pollMs || 4000),
    roots: (file.roots && file.roots.length ? file.roots : [process.cwd()]).map((r) => path.resolve(r)),
    commands: file.commands || ["npm", "npx", "pnpm", "yarn", "node", "git", "python", "python3", "pytest", "echo", "ls", "dir", "type", "cat"],
    maxOutput: Number(file.maxOutput || 20000),
    cmdTimeoutMs: Number(file.cmdTimeoutMs || 120000),
  };
}

export function createBridge({ config, onLog = () => {} }) {
  const CFG = normalizeConfig(config);
  let running = false;
  let _browser = null, _page = null;
  const log = (s) => onLog(String(s));

  const resolveInRoots = (p) => {
    if (!p) throw new Error("缺 path");
    const abs = path.resolve(p);
    const cmp = process.platform === "win32" ? (s) => s.toLowerCase() : (s) => s;
    const ok = CFG.roots.some((root) => {
      const r = cmp(root.endsWith(path.sep) ? root : root + path.sep);
      return cmp(abs) === cmp(root) || cmp(abs).startsWith(r);
    });
    if (!ok) throw new Error(`路徑不在允許範圍：${abs}（允許：${CFG.roots.join(", ")}）`);
    return abs;
  };
  const clip = (s) => { s = String(s ?? ""); return s.length > CFG.maxOutput ? s.slice(0, CFG.maxOutput) + `\n…（已截斷，共 ${s.length} 字）` : s; };

  async function getPage() {
    if (_page) return _page;
    let chromium;
    try { chromium = (await import("playwright")).chromium; }
    catch { throw new Error("桌面助手未安裝 Playwright（瀏覽器工具需另外安裝：npm install playwright && npx playwright install chromium）"); }
    _browser = await chromium.launch({ headless: false });
    _page = await _browser.newPage();
    return _page;
  }
  async function closeBrowser() { try { await _browser?.close(); } catch { /* ignore */ } _browser = _page = null; }

  const HANDLERS = {
    "filesystem.list": async ({ path: p }) => {
      const abs = resolveInRoots(p);
      return { path: abs, entries: fs.readdirSync(abs, { withFileTypes: true }).slice(0, 500).map((e) => ({ name: e.name, type: e.isDirectory() ? "dir" : "file" })) };
    },
    "filesystem.read": async ({ path: p }) => {
      const abs = resolveInRoots(p);
      if (fs.statSync(abs).size > 512 * 1024) throw new Error("檔案過大（>512KB），不讀");
      return { path: abs, content: clip(fs.readFileSync(abs, "utf8")) };
    },
    "filesystem.write": async ({ path: p, content }) => {
      const abs = resolveInRoots(p);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, String(content ?? ""), "utf8");
      return { path: abs, bytes: Buffer.byteLength(String(content ?? "")) };
    },
    "browser.open": async ({ url }) => {
      if (!/^https?:\/\//.test(String(url ?? ""))) throw new Error("url 必須是 http(s)://");
      const page = await getPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      return { url: page.url(), title: await page.title(), text: clip(await page.evaluate(() => document.body?.innerText ?? "")) };
    },
    "browser.click": async ({ text }) => {
      const page = await getPage();
      if (!text) throw new Error("缺 text");
      await page.getByText(String(text), { exact: false }).first().click({ timeout: 15000 });
      await page.waitForLoadState("domcontentloaded").catch(() => {});
      return { url: page.url(), title: await page.title(), text: clip(await page.evaluate(() => document.body?.innerText ?? "")) };
    },
    "browser.type": async ({ selector, text }) => {
      const page = await getPage();
      const s = String(selector ?? "");
      const loc = s.startsWith("#") || s.includes(" ") || /[.[]/.test(s) ? page.locator(s) : page.getByPlaceholder(s).or(page.getByLabel(s));
      await loc.first().fill(String(text ?? ""), { timeout: 15000 });
      return { url: page.url(), filled: true };
    },
    "browser.screenshot": async () => {
      const page = await getPage();
      const buf = await page.screenshot({ type: "png", fullPage: false });
      return { image: "data:image/png;base64," + buf.toString("base64"), url: page.url() };
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
    const res = await fetch(CFG.apiBase + pathname, { ...init, headers: { Authorization: `Bearer ${CFG.token}`, "Content-Type": "application/json", ...(init?.headers || {}) } });
    if (!res.ok) throw new Error(`${pathname} → ${res.status} ${await res.text().catch(() => "")}`);
    return res.json();
  }

  async function handleCall(c) {
    try {
      const h = HANDLERS[c.tool];
      if (!h) throw new Error(`本機不支援工具 ${c.tool}`);
      const data = await h(c.args || {});
      await api("/api/agent/bridge/result", { method: "POST", body: JSON.stringify({ callId: c.id, ok: true, result: data }) });
      log(`  ✓ ${c.tool}`);
    } catch (e) {
      await api("/api/agent/bridge/result", { method: "POST", body: JSON.stringify({ callId: c.id, ok: false, result: { error: String(e?.message ?? e) } }) }).catch(() => {});
      log(`  ✗ ${c.tool}: ${e?.message ?? e}`);
    }
  }

  async function loop() {
    while (running) {
      try {
        const { calls } = await api("/api/agent/bridge/poll", { method: "GET" });
        for (const c of calls || []) { log(`▶ 領到：${c.tool} ${JSON.stringify(c.args)}`); await handleCall(c); }
      } catch (e) { log(`  輪詢失敗：${e?.message ?? e}`); }
      await new Promise((r) => setTimeout(r, CFG.pollMs));
    }
  }

  return {
    config: CFG,
    start() {
      if (running) return;
      if (!CFG.token) throw new Error("尚未設定裝置 token");
      running = true;
      log(`● 已啟動 · 雲端 ${CFG.apiBase}`);
      log(`  允許資料夾：${CFG.roots.join(", ")}`);
      log(`  白名單指令：${CFG.commands.join(", ")}`);
      log("  等待任務中…");
      loop();
    },
    async stop() { running = false; await closeBrowser(); log("■ 已停止"); },
  };
}
