import type { WidgetPosition } from "./grid";
import type { WidgetId } from "./registry";

export type { WidgetPosition };

/** DB widget_instances 一列（前端用）。 */
export type WidgetInstance = {
  id: string;
  layout_id: string;
  widget_type: WidgetId | string;
  position: Partial<WidgetPosition>;
  config: Record<string, unknown>;
  hidden: boolean;
  locked: boolean;
};

/** widget_layouts 一列。 */
export type WidgetLayout = {
  id: string;
  name: string;
  is_active: boolean;
  breakpoint_config: Record<string, unknown>;
};

/** 每個 widget 實作元件收到的 props（自己 client-side fetch 自己的資料）。 */
export type WidgetProps<TConfig = Record<string, unknown>> = {
  instanceId: string;
  config: TConfig;
  userId?: string | null;
  editing?: boolean;
};
