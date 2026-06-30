/** 創作引擎：7 種創作類型 + 各自的專屬工具（mode 對應 /api/creator-island/ai/assist）。 */

export type ToolAction =
  | "insertEnd"   // 把 AI 輸出插到文末（續寫/大綱/角色卡/骨架…）
  | "replaceSel"  // 取代選取（沒選取則插到游標）（改寫/潤稿/擴寫…）
  | "panel";      // 結果顯示在側欄面板、不直接插入（一致性檢查/押韻/Suno…可再複製）

export type Tool = {
  mode: string;          // 對應 assist 路由的 mode
  label: string;
  action: ToolAction;
  needsSel?: boolean;    // true = 需要先選取文字
  toMeta?: string;       // panel 模式：把結果同時存進 draft.meta[key]
  promptLang?: boolean;  // true = 跳出輸入框問語言（translate）
};

export type CreationType = {
  key: string;
  emoji: string;
  label: string;
  blurb: string;         // 類型一句話介紹
  placeholder: string;
  tools: Tool[];
};

// 通用工具（每個類型都會附上）
const COMMON: Tool[] = [
  { mode: "continue", label: "✍️ AI 續寫", action: "insertEnd" },
  { mode: "rewrite", label: "🔁 改寫選取", action: "replaceSel", needsSel: true },
  { mode: "polish", label: "✨ 潤稿/煉字", action: "replaceSel" },
  { mode: "expand", label: "➕ 擴寫", action: "replaceSel", needsSel: true },
  { mode: "shorten", label: "➖ 精簡", action: "replaceSel", needsSel: true },
  { mode: "translate", label: "🌏 轉譯", action: "replaceSel", needsSel: true, promptLang: true },
];

export const CREATION_TYPES: CreationType[] = [
  {
    key: "novel", emoji: "📖", label: "長篇小說",
    blurb: "章節大綱、角色卡、世界觀、續寫與一致性檢查。",
    placeholder: "第一章……從一個畫面、一句對白開始。",
    tools: [
      { mode: "outline_chapters", label: "🗂 章節大綱", action: "insertEnd" },
      { mode: "character_card", label: "🧑 角色卡", action: "panel" },
      { mode: "worldbuilding", label: "🌍 世界觀設定", action: "panel" },
      { mode: "consistency", label: "🔎 一致性檢查", action: "panel" },
      { mode: "title", label: "🏷 取書名", action: "panel" },
      ...COMMON,
    ],
  },
  {
    key: "short_story", emoji: "📝", label: "短篇 / 故事",
    blurb: "三幕骨架、結局發想、續寫、取標題。",
    placeholder: "一個人物、一個慾望、一個阻礙……",
    tools: [
      { mode: "three_act", label: "🎭 三幕骨架", action: "insertEnd" },
      { mode: "ending", label: "🎬 結局發想", action: "panel" },
      { mode: "title", label: "🏷 取標題", action: "panel" },
      ...COMMON,
    ],
  },
  {
    key: "song", emoji: "🎵", label: "歌詞",
    blurb: "段落結構、押韻建議、Suno 與 MV 提示詞。",
    placeholder: "【Verse】\n……\n【Chorus】\n……",
    tools: [
      { mode: "song_structure", label: "🎼 段落結構", action: "insertEnd" },
      { mode: "rhyme", label: "🎤 押韻建議", action: "panel", needsSel: true },
      { mode: "suno", label: "🎧 Suno 提示", action: "panel", toMeta: "sunoPrompt" },
      { mode: "mv", label: "📹 MV 分鏡", action: "panel", toMeta: "mvPrompt" },
      ...COMMON,
    ],
  },
  {
    key: "poem", emoji: "🪶", label: "詩",
    blurb: "選形式骨架、意象擴展、煉字。",
    placeholder: "把一個瞬間，寫成一行……",
    tools: [
      { mode: "poem_form", label: "📐 選形式骨架", action: "insertEnd", promptLang: false },
      { mode: "imagery", label: "🌌 意象擴展", action: "panel" },
      ...COMMON,
    ],
  },
  {
    key: "script", emoji: "🎬", label: "劇本 / 腳本",
    blurb: "場景骨架、對白生成、分鏡、短影音腳本。",
    placeholder: "場景一　內　咖啡廳　日\n……",
    tools: [
      { mode: "scene", label: "🎞 場景骨架", action: "insertEnd" },
      { mode: "dialogue", label: "💬 對白生成", action: "insertEnd" },
      { mode: "storyboard", label: "🎫 分鏡表", action: "panel", needsSel: true },
      { mode: "short_video", label: "📱 短影音腳本", action: "insertEnd" },
      ...COMMON,
    ],
  },
  {
    key: "article", emoji: "✍️", label: "文章",
    blurb: "大綱、續寫、潤稿、SEO 標題與摘要。",
    placeholder: "這篇文章想帶讀者得到什麼？",
    tools: [
      { mode: "outline", label: "🗂 大綱", action: "insertEnd" },
      { mode: "seo", label: "🔍 SEO 標題/摘要", action: "panel" },
      { mode: "title", label: "🏷 取標題", action: "panel" },
      ...COMMON,
    ],
  },
  {
    key: "copy", emoji: "📣", label: "文案 / 品牌",
    blurb: "Slogan、品牌故事、賣點、平台適配。",
    placeholder: "你要賣的是什麼？給誰？",
    tools: [
      { mode: "slogan", label: "💥 Slogan 多版本", action: "panel" },
      { mode: "brand_story", label: "📖 品牌故事", action: "insertEnd" },
      { mode: "selling_points", label: "✅ 賣點條列", action: "panel" },
      { mode: "platform_adapt", label: "📲 平台適配", action: "panel", needsSel: true },
      ...COMMON,
    ],
  },
];

export function getType(key: string): CreationType {
  return CREATION_TYPES.find((t) => t.key === key) ?? CREATION_TYPES[5]; // 預設 article
}
