import sanitizeHtml from "sanitize-html";

/**
 * 伺服器端「白名單」清洗（B1）——用在跨使用者可見的 UGC 渲染面（blog 文章 / 論壇貼文）。
 *
 * 跟 client 端輕量的 regex `sanitizeRichHtml`（rich-html.ts）是雙層防護：
 *   - 這支：白名單、只放行 TipTap 會吐的標籤/屬性/樣式，從根本擋住 mutation XSS / 冷門向量。
 *   - regex 那支：client 端便宜的第二層，避免把 sanitize-html 打進 client bundle。
 *
 * ⚠️ 只在 server component / route handler import（會把 sanitize-html 帶進 bundle）。
 */
const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "br", "hr",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "b", "i", "strong", "em", "u", "s", "strike", "del", "mark", "sub", "sup",
  "a", "img", "span",
  "table", "thead", "tbody", "tr", "th", "td",
  "figure", "figcaption",
  // 媒體：部落格可內嵌圖/影/音 + YouTube
  "video", "audio", "source", "iframe",
];

export function sanitizeRichHtmlStrict(html: unknown): string {
  if (typeof html !== "string" || !html) return "";
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "title", "target", "rel", "download"],
      img: ["src", "alt", "title", "width", "height"],
      video: ["src", "controls", "width", "height", "poster", "preload", "loop", "muted", "playsinline", "class"],
      audio: ["src", "controls", "preload", "loop", "class"],
      source: ["src", "type"],
      iframe: ["src", "width", "height", "frameborder", "allow", "allowfullscreen", "title", "class"],
      span: ["style", "class"],
      mark: ["style"],
      p: ["style", "class"],
      code: ["class"],
      pre: ["class"],
      th: ["colspan", "rowspan", "scope"],
      td: ["colspan", "rowspan"],
      "*": ["class"],
    },
    // href/連結只放安全協定；img 另外放 data:（貼上時的內嵌圖）
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: {
      img: ["http", "https", "data"],
      video: ["http", "https"],
      audio: ["http", "https"],
      source: ["http", "https"],
      iframe: ["https"],
    },
    // iframe 只放行影片平台、擋掉任意網站內嵌（防 clickjacking / 釣魚）
    allowedIframeHostnames: ["www.youtube.com", "youtube.com", "www.youtube-nocookie.com", "player.vimeo.com"],
    allowProtocolRelative: false,
    // 只放行視覺類 inline style，擋掉 position/expression 之類
    allowedStyles: {
      "*": {
        color: [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(/, /^rgba\(/, /^[a-zA-Z]+$/],
        "background-color": [/^#[0-9a-fA-F]{3,8}$/, /^rgb\(/, /^rgba\(/, /^[a-zA-Z]+$/],
        "text-align": [/^(left|right|center|justify)$/],
      },
    },
    // 外連一律 noopener + nofollow + 新分頁
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href || "";
        const isExternal = /^https?:\/\//i.test(href);
        return {
          tagName: "a",
          attribs: {
            ...attribs,
            ...(isExternal ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {}),
          },
        };
      },
    },
    disallowedTagsMode: "discard",
  });
}
