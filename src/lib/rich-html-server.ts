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
  // Callout 提示框（TipTap 自訂節點）→ 存檔會吐 <div data-callout="info">…</div>
  "div",
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
      // span：+ Mention（@提及）會吐 data-type/data-id/data-label
      span: ["style", "class", "data-type", "data-id", "data-label"],
      mark: ["style"],
      p: ["style", "class"],
      // Callout 提示框外框：data-callout 決定 info/warn/success（class 已由 "*" 放行）
      div: ["class", "data-callout"],
      // TextAlign 會把 style 寫到 heading/blockquote/li 上；沒放行的話對齊會在存檔時被清掉
      h1: ["style", "class"], h2: ["style", "class"], h3: ["style", "class"],
      h4: ["style", "class"], h5: ["style", "class"], h6: ["style", "class"],
      blockquote: ["style", "class"], li: ["style", "class"],
      code: ["class"],
      // pre：+ 升級版程式碼區塊的檔名（存成 data-filename）
      pre: ["class", "data-filename"],
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
        // TipTap TextStyleColorSize 會吐 font-size（px/em/rem/pt/%）；之前沒放行 → 存檔被清掉、字級跑掉
        "font-size": [/^\d{1,3}(\.\d+)?(px|em|rem|pt|%)$/],
        "font-family": [/^[\w\s,"'-]+$/],
        "line-height": [/^\d{1,3}(\.\d+)?(px|em|rem|%)?$/],
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
    // 防 sanitize-html xmp/raw-text passthrough XSS（GHSA-rpr9-rxv7-x643，目前無修補版）：
    // 這些「原始文字」標籤連內容一起丟掉，不只是去標籤、避免內文被當原始 HTML 透出。
    nonTextTags: ["style", "script", "textarea", "option", "xmp", "noscript", "noembed", "noframes", "plaintext"],
  });
}
