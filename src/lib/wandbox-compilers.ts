// Wandbox compiler id 對照（piston 正規語言名 → wandbox compiler id）。
// ⚠️ 這個檔由 `node scripts/update-wandbox-compilers.mjs` 自動產生/更新（每月一次、見
//    .github/workflows/wandbox-update.yml）。手動改也行、但下次自動更新會覆蓋。
// 來源：https://wandbox.org/api/list.json
// 最後更新：2026-06-22
export const WANDBOX_COMPILER: Record<string, string> = {
  bash: "bash",
  python: "cpython-3.14.0",
  "c++": "gcc-13.2.0",
  c: "gcc-13.2.0-c",
  go: "go-1.23.2",
  rust: "rust-1.82.0",
  java: "openjdk-jdk-22+36",
  csharp: "mono-6.12.0.199",
  ruby: "ruby-4.0.2",
  php: "php-8.3.12",
  typescript: "typescript-5.6.2",
  lua: "lua-5.4.7",
};
