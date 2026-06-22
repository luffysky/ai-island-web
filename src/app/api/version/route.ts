import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 顯示線上跑的是哪個 commit / 何時 build。部署後一眼確認「線上是不是最新版」。
// APP_COMMIT / APP_BUILT_AT 由 Docker build 時的 build-arg 注入（docker.yml 帶 github.sha）。
export async function GET() {
  const commit = process.env.APP_COMMIT || "dev";
  return NextResponse.json({
    commit,
    commitShort: commit.slice(0, 7),
    builtAt: process.env.APP_BUILT_AT || null,
    node: process.version,
    now: new Date().toISOString(),
  });
}
