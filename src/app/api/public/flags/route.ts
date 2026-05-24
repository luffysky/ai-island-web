import { NextResponse } from "next/server";
import { isIslandEnabled } from "@/lib/app-settings";

export const dynamic = "force-dynamic";

/**
 * 公開的全站 flag — 給 client 元件 (CommandPalette / MobileBottomNav 等) 判斷是否顯示島嶼入口。
 * - 不包敏感資訊；僅暴露對 UI 行為有用的 flag
 * - 30 秒 server-side cache (app-settings.ts) 已足夠、不另加 CDN
 */
export async function GET() {
  const islandEnabled = await isIslandEnabled();
  return NextResponse.json({ islandEnabled });
}
