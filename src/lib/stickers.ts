// 自建動態貼圖清單（SVG 在 public/stickers/，用 scripts/build-stickers.mjs 產生）。
// 插入訊息/留言時用「絕對網址」→ 既有的圖片網址渲染路徑（<img>）就會顯示、且會動。
export interface Sticker {
  id: string;
  label: string;
}

export const STICKERS: Sticker[] = [
  { id: "happy", label: "開心" },
  { id: "love", label: "愛你" },
  { id: "lol", label: "大笑" },
  { id: "cry", label: "哭哭" },
  { id: "wink", label: "眨眼" },
  { id: "sleepy", label: "想睡" },
  { id: "wow", label: "驚訝" },
  { id: "cool", label: "酷" },
  { id: "angry", label: "生氣" },
  { id: "yes", label: "讚啦" },
  { id: "hi", label: "嗨" },
  { id: "shy", label: "害羞" },
];

/** 貼圖的相對路徑（顯示縮圖用）。 */
export const stickerPath = (id: string) => `/stickers/${id}.svg`;

/** 插入訊息用的絕對網址（讓 http(s) 圖片渲染規則吃得到；SSR 時退回相對路徑）。 */
export const stickerInsertUrl = (id: string) =>
  (typeof window !== "undefined" ? window.location.origin : "") + stickerPath(id);
