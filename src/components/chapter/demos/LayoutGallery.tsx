"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Code2, Smartphone, Tablet, Monitor, X } from "lucide-react";

/**
 * 版面圖鑑 — 互動版。點一種版型 → 用真 HTML/CSS 即時排出來；
 * 拖右緣改寬度 → 當場看 RWD 重排；「看 CSS」秀出產生它的 code。
 * 純 div + inline style、亮暗安全、窄屏可縮。無新套件。
 */

// 一塊「積木」——代表 header / sidebar / main / card…
function Blk({ label, style, sub }: { label: string; style: CSSProperties; sub?: string }) {
  return (
    <div
      style={{
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#1e293b",
        fontSize: 11,
        fontWeight: 600,
        padding: 6,
        textAlign: "center",
        lineHeight: 1.2,
        transition: "all .25s ease",
        overflow: "hidden",
        ...style,
      }}
    >
      <span>{label}</span>
      {sub && <span style={{ fontSize: 9, fontWeight: 400, opacity: 0.7 }}>{sub}</span>}
    </div>
  );
}

const C = {
  header: "#a5b4fc",
  nav: "#93c5fd",
  main: "#ddd6fe",
  aside: "#bae6fd",
  footer: "#cbd5e1",
  hero: "#c4b5fd",
  card: ["#fca5a5", "#fcd34d", "#86efac", "#67e8f9", "#a5b4fc", "#f9a8d4"],
};

type LayoutDef = {
  id: string;
  name: string;
  note: string;
  essence: string;       // 一句話重點
  render: (w: number) => React.ReactNode;
  css: string;
};

const GAP = 8;
const flexCol: CSSProperties = { display: "flex", flexDirection: "column", gap: GAP, height: "100%" };

const LAYOUTS: LayoutDef[] = [
  {
    id: "single",
    name: "單欄 Single Column",
    note: "由上往下一直線、手機最愛",
    essence: "所有區塊各佔一行、垂直堆疊。最單純、天生 RWD。",
    render: () => (
      <div style={flexCol}>
        <Blk label="Header" style={{ background: C.header, height: 34 }} />
        <Blk label="Content" style={{ background: C.main, flex: 1 }} />
        <Blk label="Footer" style={{ background: C.footer, height: 28 }} />
      </div>
    ),
    css: `.page { display: flex; flex-direction: column; gap: 16px; }
/* 每塊自然佔滿一行、由上往下排 */`,
  },
  {
    id: "sidebar",
    name: "側欄 Sidebar",
    note: "側邊選單 + 主內容（後台常見）",
    essence: "寬螢幕左右並排；變窄時側欄自動收到上面 → 這就是 RWD。",
    render: (w) => {
      const narrow = w < 560;
      return (
        <div style={flexCol}>
          <Blk label="Header" style={{ background: C.header, height: 30 }} />
          <div style={{ display: "flex", flexDirection: narrow ? "column" : "row", gap: GAP, flex: 1 }}>
            <Blk label="Sidebar" sub={narrow ? "↑ 收到上面了" : undefined} style={{ background: C.nav, width: narrow ? "100%" : 130, height: narrow ? 30 : "auto" }} />
            <Blk label="Main" style={{ background: C.main, flex: 1 }} />
          </div>
          <Blk label="Footer" style={{ background: C.footer, height: 26 }} />
        </div>
      );
    },
    css: `.body { display: flex; gap: 16px; }
.sidebar { width: 220px; }
.main { flex: 1; }
@media (max-width: 560px) {   /* 變窄 → 改直排 */
  .body { flex-direction: column; }
  .sidebar { width: 100%; }
}`,
  },
  {
    id: "grid",
    name: "卡片格 Grid",
    note: "作品集 / 商品牆",
    essence: "卡片自動依寬度決定欄數：3 → 2 → 1。auto-fit 是 RWD 神器。",
    render: (w) => {
      const cols = w < 460 ? 1 : w < 720 ? 2 : 3;
      return (
        <div style={flexCol}>
          <Blk label="Header" style={{ background: C.header, height: 30 }} />
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: GAP, flex: 1 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Blk key={i} label={`卡 ${i + 1}`} style={{ background: C.card[i % C.card.length], minHeight: 44 }} />
            ))}
          </div>
        </div>
      );
    },
    css: `.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
}
/* 欄數依容器寬度自動長出來、不用寫 media query */`,
  },
  {
    id: "holygrail",
    name: "聖杯 Holy Grail",
    note: "Header + 三欄 + Footer（經典 App 殼）",
    essence: "左選單、中內容、右側欄；窄屏三欄疊成一直線。",
    render: (w) => {
      const stack = w < 680;
      return (
        <div style={flexCol}>
          <Blk label="Header" style={{ background: C.header, height: 28 }} />
          <div style={{ display: "flex", flexDirection: stack ? "column" : "row", gap: GAP, flex: 1 }}>
            <Blk label="Nav" style={{ background: C.nav, width: stack ? "100%" : 90, height: stack ? 24 : "auto" }} />
            <Blk label="Main" style={{ background: C.main, flex: 1, minHeight: 44 }} />
            <Blk label="Aside" style={{ background: C.aside, width: stack ? "100%" : 90, height: stack ? 24 : "auto" }} />
          </div>
          <Blk label="Footer" style={{ background: C.footer, height: 24 }} />
        </div>
      );
    },
    css: `.body { display: grid; grid-template-columns: 180px 1fr 180px; gap: 16px; }
@media (max-width: 680px) {
  .body { grid-template-columns: 1fr; }  /* 三欄疊成一欄 */
}`,
  },
  {
    id: "split",
    name: "對半 Split Screen",
    note: "左右各半、形象頁常用",
    essence: "兩塊各佔 50%；窄屏上下疊。",
    render: (w) => {
      const stack = w < 520;
      return (
        <div style={{ display: "flex", flexDirection: stack ? "column" : "row", gap: GAP, height: "100%" }}>
          <Blk label="左半" style={{ background: C.hero, flex: 1 }} />
          <Blk label="右半" style={{ background: C.aside, flex: 1 }} />
        </div>
      );
    },
    css: `.split { display: flex; }
.split > * { flex: 1; }   /* 兩邊各半 */
@media (max-width: 520px) { .split { flex-direction: column; } }`,
  },
  {
    id: "hero",
    name: "Hero 落地頁",
    note: "大橫幅 + 特點卡（轉換頁）",
    essence: "上面一張大 Hero，下面三個特點卡，卡片窄屏收成一欄。",
    render: (w) => {
      const cols = w < 520 ? 1 : 3;
      return (
        <div style={flexCol}>
          <Blk label="Hero 大橫幅" sub="標語 + 行動按鈕" style={{ background: C.hero, height: 60 }} />
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: GAP, flex: 1 }}>
            {["特點 A", "特點 B", "特點 C"].map((t, i) => (
              <Blk key={i} label={t} style={{ background: C.card[i], minHeight: 40 }} />
            ))}
          </div>
        </div>
      );
    },
    css: `.hero { min-height: 60vh; display: grid; place-items: center; }
.features { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
@media (max-width: 520px) { .features { grid-template-columns: 1fr; } }`,
  },
  {
    id: "magazine",
    name: "雜誌 Magazine",
    note: "大小混排、內容有層次",
    essence: "一塊主打大、其餘小卡環繞，做出閱讀層次。",
    render: (w) => {
      const stack = w < 560;
      return (
        <div style={flexCol}>
          <Blk label="Header" style={{ background: C.header, height: 26 }} />
          <div style={{ display: "flex", flexDirection: stack ? "column" : "row", gap: GAP, flex: 1 }}>
            <Blk label="主打報導" style={{ background: C.card[0], flex: stack ? "none" : 2, height: stack ? 50 : "auto" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: GAP, flex: 1 }}>
              <Blk label="小卡 1" style={{ background: C.card[2], flex: 1, minHeight: 22 }} />
              <Blk label="小卡 2" style={{ background: C.card[3], flex: 1, minHeight: 22 }} />
            </div>
          </div>
        </div>
      );
    },
    css: `.mag { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
.feature { grid-row: span 2; }   /* 主打佔大格 */`,
  },
  {
    id: "fullscreen",
    name: "全螢幕 Full-Screen",
    note: "整頁一屏、滑動切換段落",
    essence: "每段吃滿整個畫面，靠 scroll-snap 一段一段停。",
    render: () => (
      <div style={{ ...flexCol, gap: GAP }}>
        <Blk label="第 1 屏" sub="scroll-snap" style={{ background: C.hero, flex: 1 }} />
        <Blk label="第 2 屏" style={{ background: C.aside, flex: 1 }} />
      </div>
    ),
    css: `.wrap { height: 100vh; overflow-y: scroll; scroll-snap-type: y mandatory; }
.section { height: 100vh; scroll-snap-align: start; }`,
  },
];

const PRESETS = [
  { label: "手機", w: 375, icon: Smartphone },
  { label: "平板", w: 768, icon: Tablet },
  { label: "桌機", w: 9999, icon: Monitor },   // 9999 = 撐滿容器
];

function deviceOf(w: number) {
  if (w < 480) return { label: "手機", icon: Smartphone };
  if (w < 768) return { label: "平板", icon: Tablet };
  return { label: "桌機", icon: Monitor };
}

export function LayoutGallery({ title, note }: { title?: string; note?: string }) {
  const [active, setActive] = useState(0);
  const [width, setWidth] = useState<number | null>(null); // null = 撐滿
  const [maxW, setMaxW] = useState(0);
  const [showCss, setShowCss] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  // 量容器可用寬度（拖曳上限）
  useEffect(() => {
    const measure = () => { if (wrapRef.current) setMaxW(wrapRef.current.clientWidth); };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const effW = width == null ? maxW : Math.min(width, maxW);
  const dev = deviceOf(effW || maxW);

  const onDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current || !wrapRef.current) return;
    const left = wrapRef.current.getBoundingClientRect().left;
    const next = Math.max(240, Math.min(e.clientX - left, maxW));
    setWidth(next);
  };
  const onUp = (e: React.PointerEvent) => {
    dragging.current = false;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
  };

  const L = LAYOUTS[active];
  const DevIcon = dev.icon;

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      {/* 標題 */}
      <div className="px-3 py-2 border-b border-border bg-bg-elevated">
        <div className="text-sm font-semibold flex items-center gap-1.5">🖼️ {title ?? "版面圖鑑 · 互動版"}</div>
        {note && <div className="text-xs text-fg-muted mt-0.5">{note}</div>}
      </div>

      {/* 版型選擇 */}
      <div className="p-3 flex flex-wrap gap-1.5 border-b border-border">
        {LAYOUTS.map((l, i) => (
          <button
            key={l.id}
            onClick={() => setActive(i)}
            className={`text-xs px-2.5 py-1 rounded-full border transition ${
              i === active
                ? "bg-accent text-black border-accent font-semibold"
                : "bg-bg border-border text-fg-muted hover:border-accent hover:text-fg"
            }`}
          >
            {l.name}
          </button>
        ))}
      </div>

      {/* 目前版型說明 + RWD 工具列 */}
      <div className="px-3 pt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-fg-muted flex-1 min-w-[180px]"><b className="text-fg">{L.name}</b>：{L.essence}</p>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-fg-muted inline-flex items-center gap-1 tabular-nums">
            <DevIcon size={12} /> {dev.label} · {effW || "—"}px
          </span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setWidth(p.w >= maxW ? null : p.w)}
              className="text-[11px] px-2 py-1 rounded bg-bg-elevated hover:bg-accent/15 text-fg-muted hover:text-accent transition inline-flex items-center gap-1"
              title={`${p.label}（${p.w >= 9999 ? "撐滿" : p.w + "px"}）`}
            >
              <p.icon size={12} /> {p.label}
            </button>
          ))}
          <button
            onClick={() => setShowCss((v) => !v)}
            className={`text-[11px] px-2 py-1 rounded inline-flex items-center gap-1 transition ${showCss ? "bg-accent/20 text-accent" : "bg-bg-elevated text-fg-muted hover:text-accent"}`}
          >
            <Code2 size={12} /> {showCss ? "收 CSS" : "看 CSS"}
          </button>
        </div>
      </div>

      {/* 預覽舞台（可拖右緣改寬度） */}
      <div ref={wrapRef} className="p-3 pt-2">
        <div className="relative" style={{ width: effW ? effW : "100%", maxWidth: "100%", transition: dragging.current ? "none" : "width .2s ease" }}>
          <div
            className="rounded-lg border border-border overflow-hidden"
            style={{ background: "#f8fafc", height: 240, padding: 10 }}
          >
            {L.render(effW || maxW)}
          </div>
          {/* 拖曳把手 */}
          <div
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            title="拖我改寬度、看 RWD"
            className="absolute top-0 -right-1 h-full w-3 cursor-ew-resize items-center justify-center hidden sm:flex touch-none"
          >
            <div className="h-10 w-1.5 rounded-full bg-accent/60 hover:bg-accent" />
          </div>
        </div>
        <div className="text-[10px] text-fg-muted mt-1.5 sm:hidden">👆 手機用上面「手機/平板/桌機」按鈕切換寬度</div>
        <div className="text-[10px] text-fg-muted mt-1.5 hidden sm:block">👉 拖右邊那條、把畫面拉窄拉寬，看版型怎麼 RWD 重排</div>
      </div>

      {/* CSS 揭曉 */}
      {showCss && (
        <div className="mx-3 mb-3 rounded-lg border border-border bg-[#0d1117] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/10">
            <span className="text-[11px] text-white/50 font-mono">產生「{L.name}」的關鍵 CSS</span>
            <button onClick={() => setShowCss(false)} className="text-white/40 hover:text-white/80"><X size={13} /></button>
          </div>
          <pre className="text-[11px] leading-relaxed p-3 overflow-x-auto text-[#c9d1d9] font-mono whitespace-pre">{L.css}</pre>
        </div>
      )}
    </div>
  );
}
