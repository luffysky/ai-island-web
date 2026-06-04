import { Mark, mergeAttributes } from "@tiptap/core";

/**
 * 自製 textStyle mark（文字顏色 + 字型大小）。
 *
 * 官方 v3 把 Color / FontSize 併進 @tiptap/extension-text-style，但本機 registry
 * 沒有對得上 core 3.23.5 的版本，所以這裡自帶一份精簡版（零外部相依）。
 * 兩個屬性都掛在同一個 <span style="..."> 上、由 mergeAttributes 合併 style 片段。
 * 輸出純 inline style → 經 sanitizeRichHtml（黑名單式）後仍保留。
 */

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textStyleColorSize: {
      setColor: (color: string) => ReturnType;
      unsetColor: () => ReturnType;
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

export const TextStyleColorSize = Mark.create({
  name: "textStyle",

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).style.color || null,
        renderHTML: (attrs) => (attrs.color ? { style: `color: ${attrs.color}` } : {}),
      },
      fontSize: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).style.fontSize || null,
        renderHTML: (attrs) => (attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span",
        getAttrs: (el) => {
          const e = el as HTMLElement;
          if (!e.style.color && !e.style.fontSize) return false;
          return {};
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    const name = this.name;
    return {
      setColor:
        (color: string) =>
        ({ chain }) =>
          chain().setMark(name, { color }).run(),
      unsetColor:
        () =>
        ({ chain, editor }) => {
          // 若同時還有字型大小、只清顏色保留 mark；否則整個拿掉避免留空 span
          const hasSize = !!editor.getAttributes(name).fontSize;
          return hasSize
            ? chain().setMark(name, { color: null }).run()
            : chain().unsetMark(name).run();
        },
      setFontSize:
        (size: string) =>
        ({ chain }) =>
          chain().setMark(name, { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain, editor }) => {
          const hasColor = !!editor.getAttributes(name).color;
          return hasColor
            ? chain().setMark(name, { fontSize: null }).run()
            : chain().unsetMark(name).run();
        },
    };
  },
});
