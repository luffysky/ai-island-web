import { NextResponse } from "next/server";
import { TOOLS } from "@/lib/agent/tools";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET /api/agent/tools — 目前註冊的工具清單（給 UI 展示能力）
export async function GET() {
  return NextResponse.json({
    tools: TOOLS.map((t) => ({
      name: t.name, description: t.description, risk: t.risk,
      needsDevice: !!t.needsDevice, platforms: t.platforms,
    })),
  });
}
