// 把 docs/grant 的九章合併成單一 full-plan.md（送審 / 丟 Codex 用）。
// ch0 現況口徑併為附錄；tech-inventory 為內部工作檔、以連結引用不內嵌。
// 用法：node scripts/build-full-plan.mjs
import fs from "node:fs";
import path from "node:path";

const DIR = path.join("docs", "grant");
const CHAPTERS = [
  "ch1-executive-summary.md",
  "ch2-market-pain.md",
  "ch3-product.md",
  "ch4-technology.md",
  "ch5-business-model.md",
  "ch6-cost.md",
  "ch7-competitive-analysis.md",
  "ch8-budget.md",
  "ch9-kpi.md",
];
const APPENDIX = ["ch0-baseline-honesty.md"];

const read = (f) => fs.readFileSync(path.join(DIR, f), "utf8").trim();

const cover = `# AI 島（ai-island-web）數位服務創新補助計畫書

> **合併版初稿**（由 \`scripts/build-full-plan.mjs\` 自九章合併）。標記：\`✅\` 已驗證 / \`🟡\` 半成品 / \`[待補]\` 待補內部數據 / \`[待查證]\` 待補外部來源 / \`[需確認]\` 待申請人確認。
> 內部工作檔（不送審）：現況口徑見附錄 A、技術事實庫見 \`docs/grant/tech-inventory.md\`。

## 目錄
1. 執行摘要
2. 市場痛點與機會
3. 產品介紹
4. 技術架構與核心技術
5. 商業模式
6. 成本結構與財務可行性
7. 競品分析
8. 經費需求與運用
9. 關鍵績效指標（KPI）
- 附錄 A：統一現況口徑與誠實界定

---
`;

const parts = [cover];
for (const f of CHAPTERS) parts.push(read(f) + "\n\n---\n");
parts.push("# 附錄 A　統一現況口徑與誠實界定\n\n> 內部一致性基準，非送審章節；供全書口徑對齊。\n");
for (const f of APPENDIX) parts.push(read(f).replace(/^#[^\n]*\n/, "") + "\n");

const out = parts.join("\n");
const outPath = path.join(DIR, "full-plan.md");
fs.writeFileSync(outPath, out, "utf8");

const words = out.replace(/\s/g, "").length;
console.log(`✅ 已產生 ${outPath}`);
console.log(`   章節 ${CHAPTERS.length} + 附錄 ${APPENDIX.length}｜約 ${words.toLocaleString()} 字（不含空白）｜${out.split("\n").length} 行`);
