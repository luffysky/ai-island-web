// 發布桌面助手安裝檔到「公開 GitHub repo」的 release（讓一般使用者能匿名下載）。
// 需 .env.local 的 GITHUB_RELEASE_TOKEN（classic PAT，scope public_repo）。
// 用法：node scripts/publish-bridge-release.mjs [version]
//   例：node scripts/publish-bridge-release.mjs 0.1.0
import fs from "node:fs";

const VERSION = process.argv[2] || "0.1.0";
const REPO = "ai-island-bridge";
const ASSET = `ai-island-bridge-${VERSION}-win.zip`;
const ZIP = `apps/desktop/dist/AI島桌面助手-${VERSION}-win.zip`;

const env = Object.fromEntries(fs.readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; }));
const TOKEN = env.GITHUB_RELEASE_TOKEN;
if (!TOKEN) { console.error("✗ .env.local 缺 GITHUB_RELEASE_TOKEN"); process.exit(1); }
if (!fs.existsSync(ZIP)) { console.error("✗ 找不到 zip：" + ZIP); process.exit(1); }

const gh = async (path, init = {}) => {
  const res = await fetch(`https://api.github.com${path}`, { ...init, headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(init.headers || {}) } });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json };
};

// 1) 誰
const me = await gh("/user");
if (me.status !== 200) { console.error("✗ token 無效：", me.json?.message ?? me.status); process.exit(1); }
const OWNER = me.json.login;
console.log("● 帳號：", OWNER);

// 2) 建 repo（已存在就沿用）
let r = await gh("/user/repos", { method: "POST", body: JSON.stringify({ name: REPO, description: "AI 島桌面助手（行動代理 Bridge）安裝檔釋出", private: false, has_issues: false, has_wiki: false, has_projects: false, auto_init: false }) });
if (r.status === 201) console.log("● 已建立公開 repo：", `${OWNER}/${REPO}`);
else if (r.status === 422) console.log("● repo 已存在、沿用：", `${OWNER}/${REPO}`);
else { console.error("✗ 建 repo 失敗：", r.status, r.json?.message ?? r.json, "\n（若權限不足，PAT 請改勾整個 repo scope）"); process.exit(1); }

// 2.5) 空 repo 不能建 release → 先放個 README 建立初始 commit / 預設分支
const readme = await gh(`/repos/${OWNER}/${REPO}/contents/README.md`, {
  method: "PUT",
  body: JSON.stringify({ message: "init", content: Buffer.from(`# AI 島桌面助手（行動代理 Bridge）\n\nWindows 安裝檔釋出處。到 **Releases** 下載最新版 zip，解壓執行 \`AI島桌面助手.exe\`（免裝 Node）。\n`).toString("base64") }),
});
if (readme.status === 201 || readme.status === 200) console.log("● 初始化 repo（README）");
else if (readme.status !== 422) console.log("● README:", readme.status, readme.json?.message ?? "");

// 3) release（tag 已存在就沿用）
const tag = `v${VERSION}`;
let rel = await gh(`/repos/${OWNER}/${REPO}/releases/tags/${tag}`);
if (rel.status !== 200) {
  rel = await gh(`/repos/${OWNER}/${REPO}/releases`, { method: "POST", body: JSON.stringify({ tag_name: tag, name: `AI 島桌面助手 ${tag}`, body: "Windows 免安裝版（解壓執行 AI島桌面助手.exe，免裝 Node）。", draft: false, prerelease: false }) });
  if (rel.status !== 201) { console.error("✗ 建 release 失敗：", rel.status, rel.json?.message ?? rel.json); process.exit(1); }
  console.log("● 已建立 release：", tag);
} else console.log("● release 已存在、沿用：", tag);
const relId = rel.json.id;

// 4) 資產（同名先刪再傳）
const assets = rel.json.assets ?? [];
const dup = assets.find((a) => a.name === ASSET);
if (dup) { await gh(`/repos/${OWNER}/${REPO}/releases/assets/${dup.id}`, { method: "DELETE" }); console.log("● 刪掉舊資產、重傳"); }
const buf = fs.readFileSync(ZIP);
console.log(`● 上傳 ${ASSET}（${(buf.length / 1048576).toFixed(1)} MB）…`);
const up = await fetch(`https://uploads.github.com/repos/${OWNER}/${REPO}/releases/${relId}/assets?name=${encodeURIComponent(ASSET)}`, {
  method: "POST", headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/zip", "X-GitHub-Api-Version": "2022-11-28" }, body: buf,
});
if (up.status !== 201) { console.error("✗ 上傳失敗：", up.status, await up.text().catch(() => "")); process.exit(1); }

const url = `https://github.com/${OWNER}/${REPO}/releases/download/${tag}/${ASSET}`;
console.log("\n✅ 完成！公開下載網址：\n" + url);
