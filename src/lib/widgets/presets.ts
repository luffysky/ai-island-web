import { WIDGET_REGISTRY, type WidgetId } from "./registry";
import { deriveTabletFromDesktop, deriveMobileFromDesktop, type GridItem, type WidgetPosition } from "./grid";

/** 預設版面：新使用者首訪自動建立的 widget 排列（desktop 12 欄）。 */
type PresetItem = { type: WidgetId; x: number; y: number; w: number; h: number };

export const DEFAULT_PRESET: PresetItem[] = [
  { type: "datetime", x: 0, y: 0, w: 4, h: 2 },
  { type: "mini_calendar", x: 8, y: 0, w: 4, h: 5 },
  { type: "todo_list", x: 0, y: 2, w: 4, h: 4 },
  { type: "countdown", x: 4, y: 0, w: 4, h: 2 },
  { type: "dice", x: 4, y: 2, w: 3, h: 3 },
];

/** 把 preset 轉成 { widget_type, position } 陣列（三斷點齊全）。 */
export function defaultLayoutInstances(): { widget_type: WidgetId; position: WidgetPosition; config: Record<string, unknown> }[] {
  const desktop: GridItem[] = DEFAULT_PRESET.map((p, i) => ({ id: String(i), x: p.x, y: p.y, w: p.w, h: p.h }));
  const tablet = deriveTabletFromDesktop(desktop);
  const mobile = deriveMobileFromDesktop(desktop);
  const tabletById = new Map(tablet.map((t) => [t.id, t]));
  const mobileById = new Map(mobile.map((m) => [m.id, m]));
  return DEFAULT_PRESET.map((p, i) => {
    const id = String(i);
    const t = tabletById.get(id)!;
    return {
      widget_type: p.type,
      position: {
        desktop: { x: p.x, y: p.y, w: p.w, h: p.h },
        tablet: { x: t.x, y: t.y, w: t.w, h: t.h },
        mobile: { order: mobileById.get(id)?.order ?? i },
      },
      config: (WIDGET_REGISTRY[p.type].defaultConfig ?? {}) as Record<string, unknown>,
    };
  });
}
