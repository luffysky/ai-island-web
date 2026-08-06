import { z } from "zod";

/**
 * Widget 註冊表（AI 島版·port from Space packages/widget-engine/src/registry.ts）。
 * 唯一真相：每個 widget 的 metadata + zod configSchema + 預設尺寸/config。
 * DB `widget_instances.widget_type` 只存字串、以此表為準（不做 DB FK）。
 * 設定面板由 configSchema 自動生成（見 config-fields.ts）。
 */

export const WIDGET_IDS = [
  // Phase A（免後端、純瀏覽器）
  "datetime",
  "dice",
  "countdown",
  "anniversary",
  "mini_calendar",
  "world_clock",
  "todo_list",
  "breathing",
] as const;

export type WidgetId = (typeof WIDGET_IDS)[number];

export type WidgetCategory = "daily" | "utility" | "fun" | "relax" | "personal" | "system";

export type WidgetDefinition<TConfig = unknown> = {
  id: WidgetId;
  name: string;
  category: WidgetCategory;
  description: string;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  maxSize: { w: number; h: number };
  configSchema: z.ZodType<TConfig>;
  defaultConfig: TConfig;
  /** 需要外部服務時標註（location / network）——Phase A 全部不需要。 */
  needs?: ("location" | "network" | "auth")[];
  featureFlag?: string;
};

// ── 各 widget config schema ──────────────────────────────────────────────
const dateTimeSchema = z.object({
  use24h: z.boolean().default(false),
  showSeconds: z.boolean().default(false),
  showGregorian: z.boolean().default(true),
  showWeekday: z.boolean().default(true),
});
const diceSchema = z.object({
  sides: z.number().int().min(2).max(100).default(6),
  count: z.number().int().min(1).max(10).default(1),
});
const countdownSchema = z.object({
  title: z.string().max(40).default("倒數"),
  targetDate: z.string().default(""),
});
const anniversarySchema = z.object({
  title: z.string().max(40).default("紀念日"),
  sinceDate: z.string().default(""),
  showDays: z.boolean().default(true),
});
const miniCalendarSchema = z.object({
  showLunar: z.boolean().default(true),
  showRoc: z.boolean().default(true),
});
const worldClockSchema = z.object({
  zone1: z.string().max(40).default("Asia/Taipei"),
  zone2: z.string().max(40).default("America/New_York"),
  zone3: z.string().max(40).default("Europe/London"),
  use24h: z.boolean().default(true),
});
const todoSchema = z.object({
  title: z.string().max(40).default("待辦"),
});
const breathingSchema = z.object({
  pattern: z.enum(["478", "box", "calm"]).default("box"),
});

export const WIDGET_REGISTRY: Record<WidgetId, WidgetDefinition> = {
  datetime: {
    id: "datetime", name: "時鐘 / 日期", category: "daily",
    description: "現在時間與日期，可選 12/24 小時、秒數、星期。",
    defaultSize: { w: 4, h: 2 }, minSize: { w: 2, h: 2 }, maxSize: { w: 12, h: 4 },
    configSchema: dateTimeSchema, defaultConfig: dateTimeSchema.parse({}),
  },
  dice: {
    id: "dice", name: "擲骰 / 隨機", category: "fun",
    description: "擲骰子做決定，可設面數與顆數。",
    defaultSize: { w: 3, h: 3 }, minSize: { w: 2, h: 2 }, maxSize: { w: 6, h: 6 },
    configSchema: diceSchema, defaultConfig: diceSchema.parse({}),
  },
  countdown: {
    id: "countdown", name: "倒數計時", category: "utility",
    description: "距離某個日子還有幾天。",
    defaultSize: { w: 4, h: 2 }, minSize: { w: 2, h: 2 }, maxSize: { w: 8, h: 4 },
    configSchema: countdownSchema, defaultConfig: countdownSchema.parse({}),
  },
  anniversary: {
    id: "anniversary", name: "紀念日 / 累計", category: "personal",
    description: "從某天起算已經過了幾天。",
    defaultSize: { w: 4, h: 2 }, minSize: { w: 2, h: 2 }, maxSize: { w: 8, h: 4 },
    configSchema: anniversarySchema, defaultConfig: anniversarySchema.parse({}),
  },
  mini_calendar: {
    id: "mini_calendar", name: "農民曆月曆", category: "daily",
    description: "本月月曆，含農曆、西元＋民國年、今日高亮。",
    defaultSize: { w: 4, h: 5 }, minSize: { w: 3, h: 4 }, maxSize: { w: 8, h: 8 },
    configSchema: miniCalendarSchema, defaultConfig: miniCalendarSchema.parse({}),
  },
  world_clock: {
    id: "world_clock", name: "世界時鐘", category: "utility",
    description: "多個時區的現在時間。",
    defaultSize: { w: 4, h: 3 }, minSize: { w: 3, h: 2 }, maxSize: { w: 8, h: 6 },
    configSchema: worldClockSchema, defaultConfig: worldClockSchema.parse({}),
  },
  todo_list: {
    id: "todo_list", name: "待辦清單", category: "utility",
    description: "簡單待辦，狀態存在這個 widget 裡。",
    defaultSize: { w: 4, h: 4 }, minSize: { w: 3, h: 3 }, maxSize: { w: 8, h: 8 },
    configSchema: todoSchema, defaultConfig: todoSchema.parse({}),
  },
  breathing: {
    id: "breathing", name: "呼吸引導", category: "relax",
    description: "跟著節奏呼吸，放鬆一下。",
    defaultSize: { w: 4, h: 4 }, minSize: { w: 3, h: 3 }, maxSize: { w: 6, h: 6 },
    configSchema: breathingSchema, defaultConfig: breathingSchema.parse({}),
  },
};

export function getWidgetDefinition(id: string): WidgetDefinition | undefined {
  return (WIDGET_REGISTRY as Record<string, WidgetDefinition>)[id];
}

export function isWidgetId(id: string): id is WidgetId {
  return id in WIDGET_REGISTRY;
}
