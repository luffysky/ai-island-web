// 自動更新 src/lib/wandbox-compilers.ts 的 compiler id。
// Wandbox 會慢慢淘汰舊版 compiler、寫死的 id 失效後該語言就跑不了。
// 這支抓 https://wandbox.org/api/list.json、每個語言挑「最新的穩定版」、重寫那個檔。
//
// 用法：node scripts/update-wandbox-compilers.mjs
// 自動排程：.github/workflows/wandbox-update.yml（每月 1 號跑、有變更才 commit）。

import { readFileSync, writeFileSync } from "node:fs";

const OUT = "src/lib/wandbox-compilers.ts";
const LIST_URL = "https://wandbox.org/api/list.json";

// 我們要的語言（key = playground/route 用的 piston 正規名）→ 怎麼從 list 挑 compiler。
// match：compiler.name 要符合；exclude：排除（head / 不要的變體）。list 大致新→舊、取第一個 match。
const TARGETS = {
  bash:         { match: /^bash$/ },
  python:       { match: /^cpython-3\.\d+/, exclude: /head/ },
  "c++":        { match: /^gcc-\d.*(?<!-c)$/, exclude: /head/ },   // 結尾不是 -c
  c:            { match: /^gcc-\d.*-c$/, exclude: /head/ },        // 結尾是 -c
  go:           { match: /^go-\d/, exclude: /head/ },
  rust:         { match: /^rust-\d/, exclude: /head/ },
  java:         { match: /^openjdk-jdk-\d/, exclude: /head/ },
  csharp:       { match: /^mono-\d/, exclude: /head/ },            // dotnetcore 在 wandbox 會崩、固定用 mono
  ruby:         { match: /^ruby-\d/, exclude: /head/ },
  php:          { match: /^php-\d/, exclude: /head/ },
  typescript:   { match: /^typescript-\d/, exclude: /head/ },
  lua:          { match: /^lua-\d/, exclude: /head/ },
};

function readCurrent() {
  try {
    const src = readFileSync(OUT, "utf8");
    const out = {};
    const re = /"?([\w+]+|c\+\+|c#|csharp)"?:\s*"([^"]+)"/g;
    let m;
    const body = src.slice(src.indexOf("{"), src.lastIndexOf("}"));
    while ((m = re.exec(body))) out[m[1]] = m[2];
    return out;
  } catch { return {}; }
}

async function main() {
  const res = await fetch(LIST_URL);
  if (!res.ok) { console.error("fetch list.json failed:", res.status); process.exit(1); }
  const list = await res.json();
  const names = list.map((c) => c.name);

  const current = readCurrent();
  const next = { ...current };
  let changed = 0;

  for (const [lang, rule] of Object.entries(TARGETS)) {
    const picked = names.find((n) => rule.match.test(n) && !(rule.exclude && rule.exclude.test(n)));
    if (!picked) { console.warn(`⚠️  ${lang}: 在 list.json 找不到、保留舊值 ${current[lang] ?? "(無)"}`); continue; }
    if (next[lang] !== picked) { console.log(`✏️  ${lang}: ${next[lang] ?? "(無)"} → ${picked}`); changed++; }
    next[lang] = picked;
  }

  const today = new Date().toISOString().slice(0, 10);
  const entries = Object.entries(next).map(([k, v]) => {
    const key = /^[a-z]+$/.test(k) ? k : JSON.stringify(k);
    return `  ${key}: ${JSON.stringify(v)},`;
  }).join("\n");

  const file = `// Wandbox compiler id 對照（piston 正規語言名 → wandbox compiler id）。
// ⚠️ 這個檔由 \`node scripts/update-wandbox-compilers.mjs\` 自動產生/更新（每月一次、見
//    .github/workflows/wandbox-update.yml）。手動改也行、但下次自動更新會覆蓋。
// 來源：https://wandbox.org/api/list.json
// 最後更新：${today}
export const WANDBOX_COMPILER: Record<string, string> = {
${entries}
};
`;
  writeFileSync(OUT, file);
  console.log(changed > 0 ? `\n✅ 更新 ${changed} 個 compiler id` : "\n✅ 已是最新、無變更");
}

main().catch((e) => { console.error(e); process.exit(1); });
