/**
 * Codemod：把「淺底 bg-{color}-500/{15-30}」配「淺 text-{color}-{200|300|400}」改成
 * 在淺底 / 深底都清楚的「text-{color}-900 dark:text-{color}-100」。
 *
 * 安全：
 *   - 只改「同色」的 bg + text 組合（bg-blue + text-blue、不動 bg-blue + text-red）
 *   - 只在 className 字串內、不動其他地方
 *   - 已有 dark:text-* 的不動（避免覆蓋手工調過的）
 *
 * 用法：
 *   node scripts/fix-low-contrast.mjs --dry    # 印 diff、不改檔
 *   node scripts/fix-low-contrast.mjs          # apply
 */
import { readFileSync, writeFileSync, statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, extname } from "node:path";

const DRY = process.argv.includes("--dry");
const ROOT = "src";
const EXTS = new Set([".ts", ".tsx", ".jsx", ".js"]);

const COLORS = [
  "red","orange","amber","yellow","lime","green","emerald","teal",
  "cyan","sky","blue","indigo","violet","purple","fuchsia","pink","rose",
  "gray","slate","zinc","neutral","stone",
];
const SHADE_MAP = { "200": "100", "300": "100", "400": "200" };
// 接受的 bg 透明度 base color shade: 400 / 500 / 600 + opacity 10/15/20/25/30
// 同色系才改
const BG_PATTERN = (color) =>
  new RegExp(`^bg-${color}-(50|100|200|300|400/(10|15|20|25|30)|500/(10|15|20|25|30)|600/(10|15|20|25|30))$`);

async function* walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (["node_modules", ".next", "dist", ".git"].includes(e.name)) continue;
      yield* walk(p);
    } else if (EXTS.has(extname(e.name))) {
      yield p;
    }
  }
}

// 處理單行 className 字串、回傳改後字串 + 是否有改
function transformClassNameStr(raw) {
  if (!raw.includes("bg-") || !raw.includes("text-")) return [raw, false];
  // 已有 dark:text-* 的這個 className、整段跳過（避免覆蓋手工調過的）
  if (/\bdark:text-/.test(raw)) return [raw, false];
  // 切 tokens（空白分隔、tailwind 允許 `bg-x text-y`）
  const tokens = raw.split(/\s+/);
  // 找所有同色 pair
  let changed = false;
  for (const color of COLORS) {
    const bgRe = new RegExp(`^bg-${color}-(50|100|200|500/(15|20|25|30))$`);
    const textRe = new RegExp(`^text-${color}-(200|300|400)$`);
    const hasBg = tokens.some((t) => bgRe.test(t));
    if (!hasBg) continue;
    for (let i = 0; i < tokens.length; i++) {
      const m = tokens[i].match(textRe);
      if (!m) continue;
      const oldShade = m[1];
      const darkShade = SHADE_MAP[oldShade] ?? "100";
      tokens[i] = `text-${color}-900 dark:text-${color}-${darkShade}`;
      changed = true;
    }
  }
  return [changed ? tokens.join(" ") : raw, changed];
}

// 找出檔案內所有 className="..." / className={`...`} / `bg-* text-*` 字串
// 簡化：match 任何 quoted string 含 bg- 跟 text-、嘗試 transform
const CLASS_STR_RE = /(["'`])((?:(?!\1)[^\\]|\\.)*?(?:bg-[a-z]+-(?:50|100|200|500\/(?:15|20|25|30)))[^"'`]*?(?:text-[a-z]+-(?:200|300|400))[^"'`]*?)\1|(["'`])((?:(?!\3)[^\\]|\\.)*?(?:text-[a-z]+-(?:200|300|400))[^"'`]*?(?:bg-[a-z]+-(?:50|100|200|500\/(?:15|20|25|30)))[^"'`]*?)\3/g;

function transformFile(content) {
  let totalChanged = 0;
  const out = content.replace(CLASS_STR_RE, (match, q1, body1, q2, body2) => {
    const q = q1 ?? q2;
    const body = body1 ?? body2;
    const [next, changed] = transformClassNameStr(body);
    if (changed) totalChanged++;
    return `${q}${next}${q}`;
  });
  return { content: out, count: totalChanged };
}

const stats = { files: 0, changedFiles: 0, totalChanges: 0 };

for await (const path of walk(ROOT)) {
  const orig = readFileSync(path, "utf8");
  stats.files++;
  const { content: next, count } = transformFile(orig);
  if (count > 0) {
    stats.changedFiles++;
    stats.totalChanges += count;
    if (DRY) {
      console.log(`📝 ${path} — 改 ${count} 處`);
      // 印前 3 處 diff
      const origLines = orig.split("\n");
      const nextLines = next.split("\n");
      let shown = 0;
      for (let i = 0; i < origLines.length && shown < 3; i++) {
        if (origLines[i] !== nextLines[i]) {
          console.log(`  L${i + 1}:`);
          console.log(`    - ${origLines[i].trim().slice(0, 180)}`);
          console.log(`    + ${nextLines[i].trim().slice(0, 180)}`);
          shown++;
        }
      }
    } else {
      writeFileSync(path, next, "utf8");
    }
  }
}

console.log(`\n${DRY ? "🔍 DRY-RUN" : "✅ APPLIED"}: 掃 ${stats.files} 檔、${stats.changedFiles} 檔需改、共 ${stats.totalChanges} 處`);
if (DRY) console.log("👉 確認 OK、跑 `node scripts/fix-low-contrast.mjs`（去掉 --dry）正式套用");
