import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * 金流商「使用者瀏覽器返回」用（有些金流是 POST 回來、頁面吃不了 POST）。
 * 這裡吃 GET/POST，抓訂單編號後 303 轉回 /store/result（GET）。
 * 真正入帳走各自的 webhook（server-to-server），這裡只負責把人帶回結果頁。
 */
async function handle(req: NextRequest) {
  const url = new URL(req.url);
  let no = url.searchParams.get("no") || "";
  if (!no && req.method === "POST") {
    try {
      const text = await req.text();
      const body = new URLSearchParams(text);
      no = body.get("MerchantTradeNo") || body.get("MerchantOrderNo") || "";
    } catch { /* ignore */ }
  }
  const site = (process.env.NEXT_PUBLIC_SITE_URL || url.origin).replace(/\/$/, "");
  return NextResponse.redirect(`${site}/store/result${no ? `?no=${encodeURIComponent(no)}` : ""}`, 303);
}

export async function GET(req: NextRequest) { return handle(req); }
export async function POST(req: NextRequest) { return handle(req); }
