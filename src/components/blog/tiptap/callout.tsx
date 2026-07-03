"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  NodeViewContent,
} from "@tiptap/react";
import { Info, AlertTriangle, CheckCircle2 } from "lucide-react";

export type CalloutVariant = "info" | "warn" | "success";

/**
 * Callout 提示框節點：注意(info) / 警告(warn) / 成功(success)。
 *
 * 存檔 HTML：`<div data-callout="info" class="callout ...">…</div>`（+ 一個 emoji 圖示子節點）。
 * ⚠️ 圓角框樣式全靠「literal Tailwind class 字串」（見 META.box）——這些字串要能被 Tailwind
 *    掃到才會產生 CSS，所以「原封不動」寫在原始碼裡、勿用字串拼接切斷 class。
 * ⚠️ sanitizer 必須放行 `div` + `data-callout`（見 src/lib/rich-html-server.ts），否則存檔被吃掉。
 */

const META: Record<CalloutVariant, { box: string; emoji: string; label: string; Icon: any; iconClass: string }> = {
  info: {
    box: "callout callout-info my-4 flex gap-3 rounded-lg border border-blue-500/40 border-l-4 border-l-blue-500 bg-blue-500/10 px-4 py-3",
    emoji: "ℹ️",
    label: "注意",
    Icon: Info,
    iconClass: "text-blue-500",
  },
  warn: {
    box: "callout callout-warn my-4 flex gap-3 rounded-lg border border-amber-500/40 border-l-4 border-l-amber-500 bg-amber-500/10 px-4 py-3",
    emoji: "⚠️",
    label: "警告",
    Icon: AlertTriangle,
    iconClass: "text-amber-500",
  },
  success: {
    box: "callout callout-success my-4 flex gap-3 rounded-lg border border-emerald-500/40 border-l-4 border-l-emerald-500 bg-emerald-500/10 px-4 py-3",
    emoji: "✅",
    label: "成功",
    Icon: CheckCircle2,
    iconClass: "text-emerald-500",
  },
};

function normalizeVariant(v: unknown): CalloutVariant {
  return v === "warn" || v === "success" ? v : "info";
}

function CalloutView({ node }: any) {
  const variant = normalizeVariant(node.attrs.variant);
  const meta = META[variant];
  const Icon = meta.Icon;
  return (
    <NodeViewWrapper
      className={meta.box}
      data-callout={variant}
    >
      <div contentEditable={false} className={`shrink-0 pt-0.5 ${meta.iconClass}`} aria-hidden="true">
        <Icon size={18} />
      </div>
      <NodeViewContent className="callout-content min-w-0 flex-1 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0" />
    </NodeViewWrapper>
  );
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (variant: CalloutVariant) => ReturnType;
      toggleCallout: (variant: CalloutVariant) => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: "info",
        parseHTML: (el) => normalizeVariant(el.getAttribute("data-callout")),
        renderHTML: (attrs) => ({ "data-callout": normalizeVariant(attrs.variant) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-callout]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const variant = normalizeVariant(node.attrs.variant);
    const meta = META[variant];
    // 存檔用（read-only 渲染也走這條）：外框 + emoji 圖示 + 內容 hole。
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-callout": variant, class: meta.box }),
      ["div", { class: "callout-ico shrink-0 select-none", "aria-hidden": "true" }, meta.emoji],
      ["div", { class: "callout-content min-w-0 flex-1" }, 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },

  addCommands() {
    return {
      setCallout:
        (variant) =>
        ({ commands }) =>
          commands.wrapIn(this.name, { variant }),
      toggleCallout:
        (variant) =>
        ({ commands }) =>
          commands.toggleWrap(this.name, { variant }),
    };
  },
});
