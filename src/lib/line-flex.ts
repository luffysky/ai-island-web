/**
 * LINE Flex Message 卡片 helper
 * 比純文字漂亮、可帶 emoji / 顏色 / 按鈕
 */

export type FlexMessage = {
  type: "flex";
  altText: string;
  contents: any;
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai-island-web.snowrealm.pet";
const ADMIN_SLUG = process.env.NEXT_PUBLIC_ADMIN_SLUG || "console-x7k2";

/**
 * 簡單通知卡（emoji + 標題 + 內文 + 可選按鈕）
 *   buildSimpleCard({ kind: "visit", emoji: "👀", title: "...", body: "...", buttons: [...] })
 */
export type SimpleCardInput = {
  emoji?: string;
  title: string;
  body?: string;
  meta?: Array<{ label: string; value: string }>;
  accentColor?: string; // hex、預設綠
  buttons?: Array<{ label: string; uri: string; primary?: boolean }>;
};

export function buildSimpleCard(input: SimpleCardInput): FlexMessage {
  const color = input.accentColor ?? "#50fa7b";
  const altText = `${input.emoji ?? ""} ${input.title}`.slice(0, 400);

  const bodyContents: any[] = [];
  if (input.body) {
    bodyContents.push({
      type: "text",
      text: input.body,
      wrap: true,
      size: "sm",
      color: "#666666",
      margin: "sm",
    });
  }
  if (input.meta && input.meta.length > 0) {
    bodyContents.push({
      type: "box",
      layout: "vertical",
      spacing: "xs",
      margin: "md",
      contents: input.meta.map((m) => ({
        type: "box",
        layout: "horizontal",
        contents: [
          { type: "text", text: m.label, size: "xs", color: "#999999", flex: 2 },
          { type: "text", text: m.value, size: "xs", color: "#333333", flex: 5, wrap: true },
        ],
      })),
    });
  }

  const bubble: any = {
    type: "bubble",
    size: "kilo",
    header: {
      type: "box",
      layout: "horizontal",
      contents: [
        { type: "text", text: input.emoji ?? "🔔", size: "lg", flex: 0, color },
        { type: "text", text: input.title, weight: "bold", size: "md", margin: "md", wrap: true, color: "#111111" },
      ],
      paddingAll: "md",
      backgroundColor: "#f4f7f3",
    },
    body: bodyContents.length > 0 ? {
      type: "box",
      layout: "vertical",
      contents: bodyContents,
      paddingAll: "md",
    } : undefined,
  };

  if (input.buttons && input.buttons.length > 0) {
    bubble.footer = {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: input.buttons.slice(0, 3).map((b) => ({
        type: "button",
        action: { type: "uri", label: b.label.slice(0, 20), uri: b.uri },
        style: b.primary ? "primary" : "secondary",
        color: b.primary ? color : undefined,
        height: "sm",
      })),
    };
  }

  return { type: "flex", altText, contents: bubble };
}

/**
 * KPI 卡片（給 /today /kpi 命令用）
 */
export function buildKpiCard(opts: {
  title: string;
  rows: Array<{ icon: string; label: string; value: string }>;
}): FlexMessage {
  return {
    type: "flex",
    altText: opts.title,
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "horizontal",
        contents: [
          { type: "text", text: "📊", size: "lg", flex: 0, color: "#50fa7b" },
          { type: "text", text: opts.title, weight: "bold", size: "md", margin: "md", color: "#111111" },
        ],
        paddingAll: "md",
        backgroundColor: "#f4f7f3",
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "md",
        contents: opts.rows.map((r) => ({
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: r.icon, size: "sm", flex: 0 },
            { type: "text", text: r.label, size: "sm", color: "#666666", margin: "sm", flex: 4 },
            { type: "text", text: r.value, size: "sm", weight: "bold", color: "#111111", align: "end", flex: 3 },
          ],
        })),
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [{
          type: "button",
          action: { type: "uri", label: "打開後台", uri: `${SITE_URL}/${ADMIN_SLUG}/admin/kpi` },
          style: "primary",
          color: "#50fa7b",
          height: "sm",
        }],
      },
    },
  };
}

/**
 * 列表卡片（給 /users /churn 用）
 */
export function buildListCard(opts: {
  title: string;
  emoji: string;
  items: Array<{ primary: string; secondary?: string }>;
  footerButton?: { label: string; uri: string };
}): FlexMessage {
  return {
    type: "flex",
    altText: opts.title,
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "horizontal",
        contents: [
          { type: "text", text: opts.emoji, size: "lg", flex: 0 },
          { type: "text", text: opts.title, weight: "bold", size: "md", margin: "md", color: "#111111" },
        ],
        paddingAll: "md",
        backgroundColor: "#f4f7f3",
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "md",
        contents: opts.items.slice(0, 10).map((it, i) => ({
          type: "box",
          layout: "vertical",
          contents: [
            { type: "text", text: `${i + 1}. ${it.primary}`, size: "sm", weight: "bold", wrap: true, color: "#111111" },
            ...(it.secondary ? [{ type: "text", text: it.secondary, size: "xs", color: "#999999", wrap: true, margin: "xs" }] : []),
          ],
        })),
      },
      footer: opts.footerButton ? {
        type: "box",
        layout: "vertical",
        contents: [{
          type: "button",
          action: { type: "uri", label: opts.footerButton.label, uri: opts.footerButton.uri },
          style: "primary",
          color: "#50fa7b",
          height: "sm",
        }],
      } : undefined,
    },
  };
}

/**
 * AI 回覆卡片（標題 AI 助理 + 內容、加按鈕可開後台）
 */
export function buildAiReplyCard(opts: { text: string; userName: string }): FlexMessage {
  return {
    type: "flex",
    altText: opts.text.slice(0, 200),
    contents: {
      type: "bubble",
      size: "kilo",
      header: {
        type: "box",
        layout: "horizontal",
        contents: [
          { type: "text", text: "✨", size: "lg", flex: 0, color: "#8be9fd" },
          { type: "text", text: `給 ${opts.userName} 的回覆`, weight: "bold", size: "sm", margin: "md", color: "#111111" },
        ],
        paddingAll: "md",
        backgroundColor: "#eef9fc",
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "md",
        contents: [{
          type: "text",
          text: opts.text.slice(0, 1500),
          wrap: true,
          size: "sm",
          color: "#222222",
        }],
      },
    },
  };
}
