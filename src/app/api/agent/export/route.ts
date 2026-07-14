import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// 把分身產出的 markdown 內容匯出成真的 .docx / .pptx / .xlsx 檔（一鍵下載）
// POST { type: "docx"|"pptx"|"xlsx", content, title? }

type Line = { text: string; level: number; bullet: boolean; ordered: boolean };

function stripInline(s: string): string {
  // 去掉 markdown 行內符號（**bold** *em* `code` [txt](url)）留純文字
  return s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .trim();
}

// 抽出所有 markdown 表格（連續的 | ... | 行；第二行是 --- 分隔）
function extractTables(content: string): string[][][] {
  const tables: string[][][] = [];
  const lines = content.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    if (/^\s*\|.*\|\s*$/.test(lines[i]) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const rows: string[][] = [];
      const header = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => stripInline(c));
      rows.push(header);
      i += 2;
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        rows.push(lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => stripInline(c)));
        i++;
      }
      tables.push(rows);
    } else i++;
  }
  return tables;
}

function parseLines(content: string): Line[] {
  const out: Line[] = [];
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) { out.push({ text: "", level: 0, bullet: false, ordered: false }); continue; }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { out.push({ text: stripInline(h[2]), level: h[1].length, bullet: false, ordered: false }); continue; }
    const b = line.match(/^\s*[-*+]\s+(.*)$/);
    if (b) { out.push({ text: stripInline(b[1]), level: 0, bullet: true, ordered: false }); continue; }
    const o = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (o) { out.push({ text: stripInline(o[1]), level: 0, bullet: false, ordered: true }); continue; }
    if (/^\s*\|.*\|\s*$/.test(line)) continue; // 表格行交給 xlsx 專用；docx 內以純文字略過
    out.push({ text: stripInline(line), level: 0, bullet: false, ordered: false });
  }
  return out;
}

async function buildDocx(content: string, title: string): Promise<Buffer> {
  const { Document, Packer, Paragraph, HeadingLevel, TextRun } = await import("docx");
  const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6];
  const paras: InstanceType<typeof Paragraph>[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(title)] }),
  ];
  for (const ln of parseLines(content)) {
    if (!ln.text) { paras.push(new Paragraph({ children: [] })); continue; }
    if (ln.level > 0) { paras.push(new Paragraph({ heading: HEADINGS[ln.level - 1], children: [new TextRun(ln.text)] })); continue; }
    if (ln.bullet) { paras.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(ln.text)] })); continue; }
    if (ln.ordered) { paras.push(new Paragraph({ numbering: { reference: "num", level: 0 }, children: [new TextRun(ln.text)] })); continue; }
    paras.push(new Paragraph({ children: [new TextRun(ln.text)] }));
  }
  const doc = new Document({
    numbering: { config: [{ reference: "num", levels: [{ level: 0, format: "decimal", text: "%1.", alignment: "left" }] }] },
    sections: [{ children: paras }],
  });
  return Packer.toBuffer(doc);
}

async function buildPptx(content: string, title: string): Promise<Buffer> {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "W", width: 10, height: 5.625 });
  pptx.layout = "W";

  // 以 `---` 或每個 H1/H2 當投影片分界
  const blocks: { title: string; bullets: string[] }[] = [];
  let cur: { title: string; bullets: string[] } | null = null;
  const push = () => { if (cur && (cur.title || cur.bullets.length)) blocks.push(cur); };
  for (const ln of parseLines(content)) {
    if (ln.text === "" ) continue;
    if (ln.level >= 1 && ln.level <= 2) { push(); cur = { title: ln.text, bullets: [] }; continue; }
    if (!cur) cur = { title, bullets: [] };
    cur.bullets.push(ln.text);
  }
  push();
  if (blocks.length === 0) blocks.push({ title, bullets: ["（空白）"] });

  // 封面
  const cover = pptx.addSlide();
  cover.background = { color: "0B1220" };
  cover.addText(title, { x: 0.5, y: 2.1, w: 9, h: 1.4, fontSize: 40, bold: true, color: "FFFFFF", align: "center" });
  cover.addText("AI 島 · 分身島產出", { x: 0.5, y: 3.5, w: 9, h: 0.5, fontSize: 16, color: "8AB4F8", align: "center" });

  for (const b of blocks) {
    const s = pptx.addSlide();
    s.background = { color: "FFFFFF" };
    s.addText(b.title || title, { x: 0.5, y: 0.35, w: 9, h: 0.9, fontSize: 26, bold: true, color: "1A2332" });
    s.addShape(pptx.ShapeType.line, { x: 0.5, y: 1.28, w: 9, h: 0, line: { color: "6D5AE6", width: 2 } });
    if (b.bullets.length) {
      s.addText(b.bullets.map((t) => ({ text: t, options: { bullet: { indent: 15 }, fontSize: 16, color: "2B3648", paraSpaceAfter: 6 } })),
        { x: 0.7, y: 1.6, w: 8.6, h: 3.6, valign: "top" });
    }
  }
  const out = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return out;
}

async function buildXlsx(content: string, title: string): Promise<Buffer> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "AI 島 · 分身島";
  const tables = extractTables(content);
  if (tables.length) {
    tables.forEach((rows, ti) => {
      const ws = wb.addWorksheet(`表格${ti + 1}`);
      rows.forEach((r, ri) => {
        const row = ws.addRow(r);
        if (ri === 0) { row.font = { bold: true, color: { argb: "FFFFFFFF" } }; row.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6D5AE6" } }; }); }
      });
      ws.columns.forEach((col) => { let m = 8; col.eachCell?.({ includeEmpty: false }, (c) => { m = Math.max(m, String(c.value ?? "").length + 2); }); col.width = Math.min(m, 60); });
    });
  } else {
    // 沒有表格 → 把逐行內容放進單一工作表
    const ws = wb.addWorksheet(title.slice(0, 28) || "內容");
    for (const ln of parseLines(content)) {
      const prefix = ln.bullet ? "• " : ln.ordered ? "– " : ln.level > 0 ? "#".repeat(ln.level) + " " : "";
      const row = ws.addRow([prefix + ln.text]);
      if (ln.level > 0) row.font = { bold: true, size: 14 - ln.level };
    }
    ws.getColumn(1).width = 80;
  }
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf as ArrayBuffer);
}

const EXT: Record<string, { mime: string; ext: string }> = {
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ext: "docx" },
  pptx: { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", ext: "pptx" },
  xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ext: "xlsx" },
};

export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const b = await req.json().catch(() => ({} as any));
  const type = String(b.type ?? "docx");
  const meta = EXT[type];
  if (!meta) return NextResponse.json({ error: "不支援的格式" }, { status: 400 });
  const content = String(b.content ?? "").slice(0, 200_000);
  if (!content.trim()) return NextResponse.json({ error: "沒有內容可匯出" }, { status: 400 });
  const rawTitle = String(b.title ?? "").trim().slice(0, 80) || "AI島產出";
  // 檔名清掉不合法字元；保留中英數
  const safe = rawTitle.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 60) || "export";

  try {
    let buf: Buffer;
    if (type === "docx") buf = await buildDocx(content, rawTitle);
    else if (type === "pptx") buf = await buildPptx(content, rawTitle);
    else buf = await buildXlsx(content, rawTitle);

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": meta.mime,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(safe)}.${meta.ext}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "匯出失敗" }, { status: 500 });
  }
}
