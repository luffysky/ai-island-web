/** 確認 DUAL / 三平台路由 env 設定狀況 */
import { readFileSync } from "node:fs";
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^['"]|['"]$/g, "")])
);
const want = [
  "NOTIFY_DUAL_USERNAMES",
  "NOTIFY_DUAL_USER_IDS",
  "NOTIFY_LINE_VIP_USERNAMES",
  "NOTIFY_LINE_VIP_USER_IDS",
  "NOTIFY_LINE_PRIORITY_KINDS",
  "ADMIN_NOTIFY_ALL",
];
const out = {};
for (const k of want) {
  const v = env[k];
  if (v === undefined) { out[k] = "MISSING"; continue; }
  // 不洩漏值、只給長度 + 是否包含 luffy
  out[k] = { len: v.length, contains_luffy: v.toLowerCase().includes("luffy") };
}
console.log(JSON.stringify(out, null, 2));
