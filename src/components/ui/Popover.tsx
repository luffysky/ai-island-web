"use client";

import {
  useFloating,
  autoUpdate,
  flip,
  shift,
  offset,
  size,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  FloatingFocusManager,
  type Placement,
} from "@floating-ui/react";
import { useState, type ReactNode } from "react";

type UsePopoverOpts = {
  placement?: Placement;
  maxWidth?: number;
  offset?: number;
  padding?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function usePopover(opts: UsePopoverOpts = {}) {
  const {
    placement = "bottom-end",
    maxWidth = 360,
    offset: gap = 8,
    padding = 8,
    open: controlledOpen,
    onOpenChange,
  } = opts;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = (v: boolean) => {
    if (controlledOpen === undefined) setInternalOpen(v);
    onOpenChange?.(v);
  };

  const floating = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(gap),
      // 寬度策略：先讓 panel 固定為 min(maxWidth, viewport-padding)，
      // 不靠 availableWidth（會把貼右側按鈕的 panel 壓得很窄）。
      size({
        padding,
        apply({ availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            width: `min(${maxWidth}px, calc(100vw - ${padding * 2}px))`,
            maxHeight: `${availableHeight}px`,
          });
        },
      }),
      flip({ padding }),
      // 主軸 + 交叉軸都 shift，panel 對齊按鈕後若往左/往右溢出視口，
      // 自動推回視口邊界內（保留 padding）。
      shift({ padding, crossAxis: true, mainAxis: true }),
    ],
  });

  const click = useClick(floating.context);
  const dismiss = useDismiss(floating.context, { outsidePress: true, escapeKey: true });
  const role = useRole(floating.context, { role: "menu" });
  const interactions = useInteractions([click, dismiss, role]);

  return {
    open,
    setOpen,
    refs: floating.refs,
    floatingStyles: floating.floatingStyles,
    context: floating.context,
    getReferenceProps: interactions.getReferenceProps,
    getFloatingProps: interactions.getFloatingProps,
  };
}

export type PopoverApi = ReturnType<typeof usePopover>;

export function PopoverPanel({
  api,
  children,
  className = "",
  style,
  withFocusManager = true,
}: {
  api: PopoverApi;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  withFocusManager?: boolean;
}) {
  if (!api.open) return null;
  const inner = (
    <div
      ref={api.refs.setFloating}
      style={{ ...api.floatingStyles, ...style }}
      {...api.getFloatingProps()}
      className={`z-50 bg-bg-card border border-border rounded-xl shadow-2xl overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
  return (
    <FloatingPortal>
      {withFocusManager ? (
        <FloatingFocusManager context={api.context} modal={false} initialFocus={-1}>
          {inner}
        </FloatingFocusManager>
      ) : (
        inner
      )}
    </FloatingPortal>
  );
}
