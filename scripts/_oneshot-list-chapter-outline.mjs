/**
 * 輸出所有 chapter 的 outline：chapter id / title / stage / lessons[id+title+oneLineSummary]
 * 用於圖文解說 audit。
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = "src/data/chapters";
const files = readdirSync(dir).filter((f) => /^ch\d+\.json$/.test(f));

const out = [];
for (const f of files) {
  const raw = JSON.parse(readFileSync(join(dir, f), "utf8"));
  out.push({
    id: raw.id,
    stage: raw.stage,
    title: raw.title,
    subtitle: raw.subtitle ?? null,
    lessons: (raw.lessons ?? []).map((l) => ({
      id: l.id,
      number: l.number,
      title: l.title,
      one: l.oneLineSummary ?? null,
    })),
  });
}
out.sort((a, b) => Number(a.id) - Number(b.id));
process.stdout.write(JSON.stringify(out, null, 0));
