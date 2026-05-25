/**
 * Emmet-style Tab expansion — 林董要的 VSCode 風 `li*3` `!` Tab 即展開
 *
 * 支援 (HTML / JSX 內):
 *   !            → HTML5 boilerplate (doctype / head / body 全套)
 *   html5        → 同上 (alias)
 *   tag*N        → N 個 tag (li*3 → 3 個 li)
 *   tag.cls      → <tag class="cls"></tag>
 *   tag#id       → <tag id="id"></tag>
 *   tag.a.b      → 多個 class
 *   tag*3>span   → tag 內含 span (簡單巢狀、一層)
 *
 * 不在 HTML 環境：Tab 預設行為 (indent 或 autocomplete)
 */

import { keymap } from "@codemirror/view";
import { Prec } from "@codemirror/state";
import type { EditorState } from "@codemirror/state";
import { startCompletion } from "@codemirror/autocomplete";
import { indentMore } from "@codemirror/commands";

const HTML5_BOILERPLATE = `<!doctype html>
<html lang="zh-Hant-TW">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Document</title>
</head>
<body>

</body>
</html>`;

const VOID_TAGS = new Set(["img", "input", "br", "hr", "meta", "link", "area", "base", "col", "embed", "source", "track", "wbr"]);

function expandEmmet(abbr: string): string | null {
  if (!abbr) return null;

  // ! 或 html5 → HTML5 boilerplate
  if (abbr === "!" || abbr === "html5") return HTML5_BOILERPLATE;

  // tag>child 簡單巢狀 (1 層)
  const nestedMatch = abbr.match(/^([a-z][a-z0-9]*)(?:\*(\d+))?>([a-z][a-z0-9]*)$/i);
  if (nestedMatch) {
    const [, outer, count, inner] = nestedMatch;
    const n = parseInt(count ?? "1", 10);
    const child = VOID_TAGS.has(inner) ? `<${inner}>` : `<${inner}></${inner}>`;
    const items = Array.from({ length: n }, () => `  ${child}`).join("\n");
    return `<${outer}>\n${items}\n</${outer}>`;
  }

  // tag*N (li*3 → 3 個 li)
  const repeatMatch = abbr.match(/^([a-z][a-z0-9]*)\*(\d+)$/i);
  if (repeatMatch) {
    const [, tag, count] = repeatMatch;
    const n = Math.min(50, parseInt(count, 10));
    const single = VOID_TAGS.has(tag) ? `<${tag}>` : `<${tag}></${tag}>`;
    return Array.from({ length: n }, () => single).join("\n");
  }

  // tag.cls.cls2 / tag#id / tag.cls#id
  const tagAttr = abbr.match(/^([a-z][a-z0-9]*)((?:[.#][a-zA-Z0-9_-]+)+)$/i);
  if (tagAttr) {
    const [, tag, rest] = tagAttr;
    const classes: string[] = [];
    let id = "";
    rest.match(/[.#][a-zA-Z0-9_-]+/g)?.forEach((part) => {
      if (part[0] === ".") classes.push(part.slice(1));
      else id = part.slice(1);
    });
    const attrs: string[] = [];
    if (id) attrs.push(`id="${id}"`);
    if (classes.length) attrs.push(`class="${classes.join(" ")}"`);
    const attrStr = attrs.length ? ` ${attrs.join(" ")}` : "";
    return VOID_TAGS.has(tag) ? `<${tag}${attrStr}>` : `<${tag}${attrStr}></${tag}>`;
  }

  // 純 tag 名 (div / span / p / etc)
  if (/^[a-z][a-z0-9]*$/i.test(abbr)) {
    return VOID_TAGS.has(abbr) ? `<${abbr}>` : `<${abbr}></${abbr}>`;
  }

  return null;
}

/** 抓 cursor 前的 word (含 ! / * / # / . / >) */
function getAbbrBeforeCursor(state: EditorState): { abbr: string; from: number } | null {
  const pos = state.selection.main.head;
  const line = state.doc.lineAt(pos);
  const before = line.text.slice(0, pos - line.from);
  // match 結尾的 emmet 風 abbr
  const m = before.match(/([!]|[a-zA-Z][a-zA-Z0-9.#*>_-]*)$/);
  if (!m) return null;
  const abbr = m[1];
  return { abbr, from: pos - abbr.length };
}

/**
 * CodeMirror 6 Tab keymap：
 *   - HTML 內、cursor 前是 Emmet pattern → 展開
 *   - 否則：先試開 autocomplete (有 snippet 出來)、若沒結果 fallback indentMore
 */
export function emmetTabKeymap(lang: string) {
  return Prec.highest(
    keymap.of([
      {
        key: "Tab",
        run: (view) => {
          // 只在 HTML / JSX / TSX 啟用 Emmet
          if (lang === "html" || lang === "jsx" || lang === "tsx") {
            const before = getAbbrBeforeCursor(view.state);
            if (before) {
              const expanded = expandEmmet(before.abbr);
              if (expanded) {
                view.dispatch({
                  changes: { from: before.from, to: view.state.selection.main.head, insert: expanded },
                  // 把 cursor 放在展開後字串的合適位置 (HTML5 boilerplate 放 body 內)
                  selection: expanded === HTML5_BOILERPLATE
                    ? { anchor: before.from + expanded.indexOf("<body>") + 7 + 2 } // 「<body>\n  」之後
                    : undefined,
                });
                return true;
              }
            }
          }
          // 預設：開 autocomplete (有 snippet 跳出來、選 Enter 套用)
          const completionResult = startCompletion(view);
          if (completionResult) return true;
          // 沒 completion → indent
          return indentMore(view);
        },
      },
    ]),
  );
}
