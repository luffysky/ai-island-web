import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 站內翻譯器後端：proxy 免費 Google 翻譯端點（client=gtx、免金鑰、零成本）。
// 支援任意語言（sl=auto 自動偵測來源）；長文分塊翻。
const MAX_CHARS = 5000;

function chunk(text: string, max = 1500): string[] {
  const parts: string[] = [];
  let cur = "";
  for (const line of text.split("\n")) {
    if ((cur + "\n" + line).length > max && cur) { parts.push(cur); cur = line; }
    else cur = cur ? cur + "\n" + line : line;
  }
  if (cur) parts.push(cur);
  return parts;
}

async function gcall(q: string, sl: string, tl: string): Promise<{ text: string; detected: string }> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(q)}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(12000) });
    if (r.status === 429 || r.status >= 500) { await new Promise((res) => setTimeout(res, 800 * (attempt + 1))); continue; }
    if (!r.ok) throw new Error(`google ${r.status}`);
    const data = await r.json();
    const text = (data[0] ?? []).map((seg: any) => seg[0]).join("");
    const detected = data[2] ?? sl;
    return { text, detected };
  }
  throw new Error("翻譯服務忙線，請稍後再試");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const q = String(body.q ?? "").slice(0, MAX_CHARS);
  const source = String(body.source ?? "auto");
  const target = String(body.target ?? "en");
  if (!q.trim()) return NextResponse.json({ translated: "", detected: source });
  if (source === target && source !== "auto") return NextResponse.json({ translated: q, detected: source });

  try {
    const chunks = chunk(q);
    const outs: string[] = [];
    let detected = source;
    for (const c of chunks) {
      const { text, detected: d } = await gcall(c, source, target);
      outs.push(text);
      detected = d;
    }
    return NextResponse.json({ translated: outs.join("\n"), detected });
  } catch (e: any) {
    return NextResponse.json({ error: "translate_failed", message: e?.message ?? "翻譯失敗" }, { status: 502 });
  }
}
