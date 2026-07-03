import { ReactRenderer } from "@tiptap/react";
import type { SuggestionOptions } from "@tiptap/suggestion";

/**
 * 共用：把一個 React 清單元件接成 @tiptap/suggestion 的 render()。
 * 用 fixed 定位的容器（跟著 caret 走）、不依賴 tippy（Pro/額外套件）。
 *
 * 清單元件需用 forwardRef 暴露 `onKeyDown(({event}) => boolean)` 供鍵盤導覽。
 */
export function createSuggestionRenderer(
  component: any,
): SuggestionOptions["render"] {
  return () => {
    let renderer: ReactRenderer | null = null;
    let el: HTMLDivElement | null = null;

    const position = (rect: DOMRect | null | undefined) => {
      if (!el || !rect) return;
      const margin = 6;
      const maxW = 260;
      let left = rect.left;
      if (left + maxW > window.innerWidth - 8) left = window.innerWidth - maxW - 8;
      left = Math.max(8, left);
      // 預設顯示在 caret 下方；若太靠底部則翻到上方
      const belowTop = rect.bottom + margin;
      const showAbove = belowTop > window.innerHeight - 240;
      el.style.left = `${left}px`;
      if (showAbove) {
        el.style.top = "";
        el.style.bottom = `${window.innerHeight - rect.top + margin}px`;
      } else {
        el.style.bottom = "";
        el.style.top = `${belowTop}px`;
      }
    };

    return {
      onStart: (props) => {
        el = document.createElement("div");
        el.style.position = "fixed";
        el.style.zIndex = "90";
        document.body.appendChild(el);
        renderer = new ReactRenderer(component, { props, editor: props.editor });
        el.appendChild(renderer.element as HTMLElement);
        position(props.clientRect?.());
      },
      onUpdate: (props) => {
        renderer?.updateProps(props);
        position(props.clientRect?.());
      },
      onKeyDown: (props) => {
        if (props.event.key === "Escape") return true;
        return (renderer?.ref as any)?.onKeyDown?.(props) ?? false;
      },
      onExit: () => {
        renderer?.destroy();
        el?.remove();
        renderer = null;
        el = null;
      },
    };
  };
}
