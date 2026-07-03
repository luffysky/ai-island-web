import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// 單元測試：只跑純模組（無 DB / 網路 / React / server-only 依賴）。
// tsconfigPaths 讓 "@/..." alias 在 vitest 下解析得到（吃 tsconfig.json 的 paths）。
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
  },
});
