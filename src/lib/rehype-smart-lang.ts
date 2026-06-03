/**
 * rehype-smart-lang
 *
 * 課程內容大量用 ```text 圍籬寫程式碼（HTML / CSS / JS / 終端機指令），
 * highlight.js 把它當純文字 → 完全不上色 → 區塊一片灰。
 *
 * 這個外掛在 rehype-highlight「之前」跑，針對沒有指定語言（或標成 text/plain）
 * 的程式碼區塊做判斷：
 *   - 看起來是 ASCII 示意圖（含箭頭 / 框線字元）→ 鎖定為 plaintext、不要亂上色
 *   - 其餘 → 移除語言類別，讓 rehype-highlight 的 detect 自動偵測語言並上色
 *
 * 不需額外套件：自己遞迴走訪 hast 樹。
 */

type HastNode = {
  type?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  value?: string;
};

// 箭頭 / 框線 / 對齊符號——出現就視為示意圖、保持原樣不上色
const DIAGRAM_CHARS = /[→←↑↓↔│─┌┐└┘├┤┬┴┼╱╲▸▾↳]/;

function getText(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  if (!node.children) return "";
  return node.children.map(getText).join("");
}

function classList(props: Record<string, unknown> | undefined): string[] {
  if (!props) return [];
  const c = props.className;
  if (Array.isArray(c)) return c as string[];
  if (typeof c === "string") return c.split(/\s+/).filter(Boolean);
  return [];
}

function walk(node: HastNode) {
  if (node.tagName === "code" && node.children) {
    const classes = classList(node.properties);
    const langClass = classes.find((c) => c.startsWith("language-"));
    const lang = langClass?.replace("language-", "");
    const isUnlabelled = !langClass || ["text", "plain", "plaintext", "txt", "none"].includes(lang ?? "");

    if (isUnlabelled) {
      const text = getText(node);
      const arrowCount = (text.match(DIAGRAM_CHARS) || []).length;
      const looksLikeDiagram = arrowCount >= 2;

      const rest = classes.filter((c) => !c.startsWith("language-"));
      if (looksLikeDiagram) {
        // 鎖定純文字、讓 highlight 跳過（避免示意圖被亂上色）
        node.properties = { ...(node.properties ?? {}), className: [...rest, "language-plaintext"] };
      } else {
        // 移除語言類別 → 交給 rehype-highlight 的 detect 自動判斷
        node.properties = { ...(node.properties ?? {}), className: rest };
      }
    }
  }
  node.children?.forEach(walk);
}

export function rehypeSmartLang() {
  return (tree: HastNode) => {
    walk(tree);
  };
}
