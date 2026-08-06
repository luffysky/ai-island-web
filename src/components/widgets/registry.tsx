"use client";
// id → lazy 元件對照 + <WidgetRenderer>（含錯誤邊界 + Suspense）。
import { lazy, Suspense, type ComponentType } from "react";
import { WidgetBoundary } from "./WidgetBoundary";
import { getWidgetDefinition, type WidgetId } from "@/lib/widgets/registry";
import type { WidgetInstance, WidgetProps } from "@/lib/widgets/types";

const COMPONENTS: Record<WidgetId, ComponentType<WidgetProps>> = {
  datetime: lazy(() => import("./impl/DateTimeWidget")),
  dice: lazy(() => import("./impl/DiceWidget")),
  countdown: lazy(() => import("./impl/CountdownWidget")),
  anniversary: lazy(() => import("./impl/AnniversaryWidget")),
  mini_calendar: lazy(() => import("./impl/MiniCalendarWidget")),
  world_clock: lazy(() => import("./impl/WorldClockWidget")),
  todo_list: lazy(() => import("./impl/TodoListWidget")),
  breathing: lazy(() => import("./impl/BreathingWidget")),
};

export function hasImplementation(id: string): id is WidgetId {
  return id in COMPONENTS;
}

export function WidgetRenderer({
  instance,
  userId,
  editing,
  onDisable,
}: {
  instance: WidgetInstance;
  userId?: string | null;
  editing?: boolean;
  onDisable?: () => void;
}) {
  const def = getWidgetDefinition(instance.widget_type);
  const Comp = hasImplementation(instance.widget_type) ? COMPONENTS[instance.widget_type] : null;

  if (!def || !Comp) {
    return (
      <div className="h-full rounded-2xl border border-border bg-bg-card grid place-items-center text-xs text-fg-muted p-3 text-center">
        未知的 widget：{instance.widget_type}
      </div>
    );
  }

  return (
    <div className="h-full rounded-2xl border border-border bg-bg-card overflow-hidden">
      <WidgetBoundary definitionId={instance.widget_type} name={def.name} onDisable={onDisable}>
        <Suspense fallback={<div className="h-full grid place-items-center text-xs text-fg-muted">載入中…</div>}>
          <Comp instanceId={instance.id} config={instance.config} userId={userId} editing={editing} />
        </Suspense>
      </WidgetBoundary>
    </div>
  );
}
