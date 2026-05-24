/**
 * LINE Flex Message 卡片 helper v2 — 美化版
 * 設計重點：
 *  - header 兩段配色（emoji 大字色塊 + 白底標題）
 *  - body 加 separator 分隔線、label-value 對齊
 *  - footer button 加 icon、horizontal 多 button 佈局
 *  - 卡片 size "mega"、加 cornerRadius、加底部時間戳
 *  - 統一字體 size、color 與設計系統一致
 */

/** Quick Reply 浮動按鈕 */
export type QuickReplyAction =
  | { type: "message"; label: string; text: string }
  | { type: "postback"; label: string; data: string; displayText?: string }
  | { type: "uri"; label: string; uri: string };

export type QuickReply = {
  items: Array<{ type: "action"; action: QuickReplyAction }>;
};

export function buildQuickReply(actions: QuickReplyAction[]): QuickReply {
  return { items: actions.slice(0, 13).map((a) => ({ type: "action", action: a })) };
}

export const COMMON_QR: QuickReplyAction[] = [
  { type: "message", label: "📊 今日", text: "/today" },
  { type: "message", label: "📈 7 天", text: "/kpi 7" },
  { type: "message", label: "👥 用戶", text: "/users" },
  { type: "message", label: "🚨 流失", text: "/churn" },
  { type: "message", label: "🛡️ 錯誤", text: "/errors" },
  { type: "message", label: "❓ 幫助", text: "/help" },
  { type: "message", label: "⚙️ 偏好", text: "/prefs" },
];

export type FlexMessage = {
  type: "flex";
  altText: string;
  contents: any;
  quickReply?: QuickReply;
};

export type LineTextMessage = {
  type: "text";
  text: string;
  quickReply?: QuickReply;
};

export function buildTextWithQR(text: string, qr?: QuickReply): LineTextMessage {
  return { type: "text", text: text.slice(0, 4900), quickReply: qr };
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";
const ADMIN_SLUG = process.env.NEXT_PUBLIC_ADMIN_SLUG || "console-x7k2";

// 時間戳記（台北時區、HH:mm）
function nowTW(): string {
  const d = new Date(Date.now() + 8 * 3600_000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

// 把顏色變深（粗略 -20%）
function darken(hex: string, amount = 0.2): string {
  const h = hex.replace("#", "");
  const r = Math.max(0, Math.floor(parseInt(h.slice(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.floor(parseInt(h.slice(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.floor(parseInt(h.slice(4, 6), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

// 把顏色變淺（粗略 +80% 白）
function lighten(hex: string, amount = 0.92): string {
  const h = hex.replace("#", "");
  const r = Math.min(255, Math.floor(parseInt(h.slice(0, 2), 16) + (255 - parseInt(h.slice(0, 2), 16)) * amount));
  const g = Math.min(255, Math.floor(parseInt(h.slice(2, 4), 16) + (255 - parseInt(h.slice(2, 4), 16)) * amount));
  const b = Math.min(255, Math.floor(parseInt(h.slice(4, 6), 16) + (255 - parseInt(h.slice(4, 6), 16)) * amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/**
 * 霧面玻璃漸層 helper — LINE Flex 沒 backdrop-filter:blur，
 * 用「主色半透明 → 淺色半透明」漸層 + alpha hex 模擬玻璃感。
 */
/**
 * LINE Flex linearGradient 的 startColor/endColor 只吃 6-digit hex (#RRGGBB)、
 * 不吃 8-digit alpha (#RRGGBBAA) — 加 alpha 會被 LINE reject、整則 reply 不送出。
 * 所以「透明感」改用 lighten 變淺、不用 alpha。
 */
function glassHeader(color: string) {
  return {
    type: "linearGradient" as const,
    angle: "135deg",
    startColor: color,
    centerColor: darken(color, 0.05),
    centerPosition: "50%",
    endColor: lighten(color, 0.2),
  };
}

/** body 帶一點 accent 色微染、不只灰白 */
function glassBody(color: string) {
  return {
    type: "linearGradient" as const,
    angle: "180deg",
    startColor: lighten(color, 0.96),
    centerColor: "#FFFFFF",
    centerPosition: "50%",
    endColor: lighten(color, 0.9),
  };
}

function glassFooter(color: string) {
  return {
    type: "linearGradient" as const,
    angle: "180deg",
    startColor: lighten(color, 0.88),
    endColor: lighten(color, 0.78),
  };
}

// 霧面玻璃的細邊 / 分隔線 / 高亮邊
const GLASS_BORDER = "#E5E8EE";
const GLASS_SEPARATOR = "#EDEFF3";

export type SimpleCardInput = {
  emoji?: string;
  title: string;
  body?: string;
  meta?: Array<{ label: string; value: string }>;
  accentColor?: string;
  buttons?: Array<
    | { label: string; uri: string; primary?: boolean }
    | { label: string; postback: string; primary?: boolean; displayText?: string }
  >;
  quickReply?: QuickReply;
};

export function buildSimpleCard(input: SimpleCardInput): FlexMessage {
  const color = input.accentColor ?? "#50fa7b";
  const colorLight = lighten(color, 0.92);
  const colorDark = darken(color, 0.15);
  const altText = `${input.emoji ?? ""} ${input.title}`.slice(0, 400);

  // body 內容組裝（meta 列、body text、separator）
  const bodyContents: any[] = [];

  if (input.body) {
    bodyContents.push({
      type: "text",
      text: input.body,
      wrap: true,
      size: "sm",
      color: "#444851",
      lineSpacing: "4px",
    });
  }

  if (input.meta && input.meta.length > 0) {
    if (bodyContents.length > 0) {
      bodyContents.push({ type: "separator", margin: "md", color: GLASS_SEPARATOR });
    }
    bodyContents.push({
      type: "box",
      layout: "vertical",
      spacing: "sm",
      margin: "md",
      contents: input.meta.map((m) => ({
        type: "box",
        layout: "baseline",
        spacing: "sm",
        contents: [
          { type: "text", text: m.label, size: "xs", color: "#8a8f99", flex: 0 },
          { type: "text", text: m.value, size: "xs", color: "#1a1d24", weight: "bold", flex: 0, wrap: true },
        ],
      })),
    });
  }

  // 底部時間戳
  bodyContents.push({ type: "separator", margin: "lg", color: GLASS_SEPARATOR });
  bodyContents.push({
    type: "text",
    text: `🕐 ${nowTW()}`,
    size: "xxs",
    color: "#a8aab2",
    align: "end",
    margin: "sm",
  });

  const bubble: any = {
    type: "bubble",
    size: "kilo",
    styles: {
      header: { backgroundColor: lighten(color, 0.5) },
      body: { backgroundColor: "#F8F9FC" },
      footer: { backgroundColor: lighten(color, 0.9) },
    },
    header: {
      type: "box",
      layout: "horizontal",
      paddingAll: "lg",
      background: glassHeader(color),
      borderWidth: "1px",
      borderColor: `${lighten(color, 0.3)}40`,
      cornerRadius: "12px",
      contents: [
        {
          type: "box",
          layout: "vertical",
          contents: [
            { type: "text", text: input.emoji ?? "🔔", size: "xxl", color: "#ffffff", align: "center" },
          ],
          flex: 0,
          width: "44px",
        },
        {
          type: "text",
          text: input.title,
          weight: "bold",
          size: "lg",
          color: "#ffffff",
          wrap: true,
          flex: 1,
          gravity: "center",
          margin: "md",
        },
      ],
    },
    body: bodyContents.length > 0 ? {
      type: "box",
      layout: "vertical",
      paddingAll: "lg",
      background: glassBody(color),
      borderWidth: "1px",
      borderColor: GLASS_BORDER,
      cornerRadius: "12px",
      contents: bodyContents,
    } : undefined,
  };

  if (input.buttons && input.buttons.length > 0) {
    bubble.footer = {
      type: "box",
      layout: input.buttons.length > 2 ? "vertical" : "horizontal",
      spacing: "sm",
      paddingAll: "md",
      background: glassFooter(color),
      borderWidth: "1px",
      borderColor: GLASS_BORDER,
      cornerRadius: "12px",
      contents: input.buttons.slice(0, 3).map((b: any) => ({
        type: "button",
        action: b.postback
          ? { type: "postback", label: String(b.label).slice(0, 20), data: b.postback, displayText: b.displayText }
          : { type: "uri", label: String(b.label).slice(0, 20), uri: b.uri },
        style: b.primary ? "primary" : "secondary",
        color: b.primary ? colorDark : undefined,
        height: "sm",
      })),
    };
  }

  return { type: "flex", altText, contents: bubble, quickReply: input.quickReply };
}

/** KPI 卡：強化版、加 hero color band */
export function buildKpiCard(opts: {
  title: string;
  rows: Array<{ icon: string; label: string; value: string }>;
}): FlexMessage {
  const color = "#5cb85c";
  return {
    type: "flex",
    altText: opts.title,
    contents: {
      type: "bubble",
      size: "kilo",
      styles: {
        header: { backgroundColor: lighten(color, 0.5) },
        body: { backgroundColor: "#F8F9FC" },
        footer: { backgroundColor: lighten(color, 0.9) },
      },
      header: {
        type: "box",
        layout: "horizontal",
        paddingAll: "lg",
        background: glassHeader(color),
        borderWidth: "1px",
        borderColor: lighten(color, 0.65),
        cornerRadius: "12px",
        contents: [
          { type: "text", text: "📊", size: "xxl", color: "#ffffff", flex: 0, width: "44px", align: "center" },
          { type: "text", text: opts.title, weight: "bold", size: "lg", color: "#ffffff", flex: 1, gravity: "center", margin: "md" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        spacing: "md",
        background: glassBody(color),
        borderWidth: "1px",
        borderColor: GLASS_BORDER,
        cornerRadius: "12px",
        contents: [
          ...opts.rows.map((r, i) => ({
            type: "box" as const,
            layout: "horizontal" as const,
            paddingBottom: i < opts.rows.length - 1 ? "sm" : undefined,
            contents: [
              { type: "text" as const, text: r.icon, size: "sm" as const, flex: 0, width: "24px" },
              { type: "text" as const, text: r.label, size: "sm" as const, color: "#444851", flex: 1 },
              { type: "text" as const, text: r.value, size: "md" as const, weight: "bold" as const, color: "#0d1117", align: "end" as const, flex: 0 },
            ],
          })),
          { type: "separator" as const, margin: "md", color: GLASS_SEPARATOR },
          { type: "text" as const, text: `🕐 ${nowTW()}`, size: "xxs" as const, color: "#a8aab2", align: "end" as const, margin: "sm" },
        ],
      },
      footer: {
        type: "box",
        layout: "horizontal",
        spacing: "sm",
        paddingAll: "md",
        background: glassFooter(color),
        borderWidth: "1px",
        borderColor: GLASS_BORDER,
        cornerRadius: "12px",
        contents: [
          {
            type: "button",
            action: { type: "uri", label: "📊 打開後台", uri: `${SITE_URL}/${ADMIN_SLUG}/admin/kpi` },
            style: "primary",
            color: darken(color, 0.15),
            height: "sm",
          },
        ],
      },
    },
  };
}

/** 列表卡：加 emoji 序號 + 分隔線 */
export function buildListCard(opts: {
  title: string;
  emoji: string;
  items: Array<{ primary: string; secondary?: string }>;
  footerButton?: { label: string; uri: string };
  accentColor?: string;
}): FlexMessage {
  const color = opts.accentColor ?? "#7a5599";
  return {
    type: "flex",
    altText: opts.title,
    contents: {
      type: "bubble",
      size: "kilo",
      styles: {
        header: { backgroundColor: lighten(color, 0.5) },
        body: { backgroundColor: "#F8F9FC" },
        footer: { backgroundColor: lighten(color, 0.9) },
      },
      header: {
        type: "box",
        layout: "horizontal",
        paddingAll: "lg",
        background: glassHeader(color),
        borderWidth: "1px",
        borderColor: lighten(color, 0.65),
        cornerRadius: "12px",
        contents: [
          { type: "text", text: opts.emoji, size: "xxl", color: "#ffffff", flex: 0, width: "44px", align: "center" },
          { type: "text", text: opts.title, weight: "bold", size: "lg", color: "#ffffff", flex: 1, gravity: "center", margin: "md" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        spacing: "md",
        background: glassBody(color),
        borderWidth: "1px",
        borderColor: GLASS_BORDER,
        cornerRadius: "12px",
        contents: [
          ...opts.items.slice(0, 10).flatMap((it, i, arr) => {
            const block = {
              type: "box" as const,
              layout: "vertical" as const,
              spacing: "xs" as const,
              contents: [
                {
                  type: "box" as const,
                  layout: "horizontal" as const,
                  contents: [
                    { type: "text" as const, text: `${i + 1}`, size: "sm" as const, color, weight: "bold" as const, flex: 0, width: "20px" },
                    { type: "text" as const, text: it.primary, size: "sm" as const, weight: "bold" as const, color: "#1a1d24", wrap: true, flex: 1 },
                  ],
                },
                ...(it.secondary ? [{ type: "text" as const, text: it.secondary, size: "xs" as const, color: "#6a6f7a", wrap: true, margin: "xs" as const, offsetStart: "20px" as const }] : []),
              ],
            };
            return i < arr.length - 1
              ? [block, { type: "separator" as const, margin: "md", color: GLASS_SEPARATOR }]
              : [block];
          }),
          { type: "text" as const, text: `🕐 ${nowTW()}`, size: "xxs" as const, color: "#a8aab2", align: "end" as const, margin: "md" },
        ],
      },
      footer: opts.footerButton ? {
        type: "box",
        layout: "horizontal",
        paddingAll: "md",
        background: glassFooter(color),
        borderWidth: "1px",
        borderColor: GLASS_BORDER,
        cornerRadius: "12px",
        contents: [{
          type: "button",
          action: { type: "uri", label: opts.footerButton.label, uri: opts.footerButton.uri },
          style: "primary",
          color: darken(color, 0.15),
          height: "sm",
        }],
      } : undefined,
    },
  };
}

/** AI 回覆卡：精緻版（更柔和、留白多）*/
export function buildAiReplyCard(opts: { text: string; userName: string }): FlexMessage {
  const color = "#5fa8d3"; // 青藍
  return {
    type: "flex",
    altText: opts.text.slice(0, 200),
    contents: {
      type: "bubble",
      size: "kilo",
      styles: {
        header: { backgroundColor: lighten(color, 0.5) },
        body: { backgroundColor: "#F8F9FC" },
      },
      header: {
        type: "box",
        layout: "horizontal",
        paddingAll: "lg",
        background: glassHeader(color),
        borderWidth: "1px",
        borderColor: lighten(color, 0.65),
        cornerRadius: "12px",
        contents: [
          { type: "text", text: "✨", size: "xxl", color: "#ffffff", flex: 0, width: "44px", align: "center" },
          {
            type: "box",
            layout: "vertical",
            flex: 1,
            contents: [
              { type: "text", text: "AI 助理", weight: "bold", size: "md", color: "#ffffff" },
              { type: "text", text: `給 ${opts.userName}`, size: "xs", color: "#E8F0F8" },
            ],
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        background: glassBody(color),
        borderWidth: "1px",
        borderColor: GLASS_BORDER,
        cornerRadius: "12px",
        contents: [
          {
            type: "text",
            text: opts.text.slice(0, 1500),
            wrap: true,
            size: "sm",
            color: "#1a1d24",
            lineSpacing: "6px",
          },
          { type: "separator", margin: "lg", color: GLASS_SEPARATOR },
          { type: "text", text: `🕐 ${nowTW()}`, size: "xxs", color: "#a8aab2", align: "end", margin: "sm" },
        ],
      },
    },
  };
}
