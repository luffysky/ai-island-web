// 把 docs/grant/*.md 打包成 src/data/grant-content.ts（bundle 進 build、後台頁直接 import；
// 不用 runtime fs、standalone 生產環境也讀得到）。改了 docs 後重跑這支。
// 用法：node scripts/gen-grant-content.mjs
import fs from "node:fs";
import path from "node:path";

const DIR = path.join("docs", "grant");
const OUT = path.join("src", "data", "grant-content.ts");

// 內部工作/批評稿不打包進 bundle（不進後台頁、不進 build）
const EXCLUDE = new Set(["待改.md"]);
const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".md") && !EXCLUDE.has(f)).sort();
const docs = files.map((f) => {
  const md = fs.readFileSync(path.join(DIR, f), "utf8");
  const m = md.match(/^#\s+(.+)$/m);
  const title = (m ? m[1] : f.replace(/\.md$/, "")).trim();
  return { slug: f.replace(/\.md$/, ""), file: f, title, markdown: md };
});

const banner = `// ⚠️ 自動生成，勿手改。來源 docs/grant/*.md；改內容後跑 node scripts/gen-grant-content.mjs
export type GrantDoc = { slug: string; file: string; title: string; markdown: string };
export const GRANT_DOCS: GrantDoc[] = ${JSON.stringify(docs, null, 2)};
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, banner, "utf8");
const chars = docs.reduce((n, d) => n + d.markdown.length, 0);
console.log(`✅ ${OUT}：${docs.length} 篇、約 ${chars.toLocaleString()} 字元`);
console.log(docs.map((d) => `   - ${d.slug}: ${d.title.slice(0, 30)}`).join("\n"));
