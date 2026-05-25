/**
 * CodeEditor snippet 庫 — Emmet 風簡寫展開
 *
 * 用 CodeMirror 6 內建 `snippet()` API、tab 鍵展開、`${1:foo}` 是 tab stop
 * 按 ctrl+space 開 autocomplete 看清單、或直接打簡寫 + tab
 *
 * 林董要加新 snippet 改這個 file 就好、CodeEditor 自動套用
 */

import { snippetCompletion, type Completion } from "@codemirror/autocomplete";
import type { CodeLang } from "./CodeEditor";

// 每個 snippet: { label (簡寫), detail (說明), code (含 tab stop) }
type Snip = { label: string; detail: string; code: string; section?: string };

const PYTHON: Snip[] = [
  { label: "def", detail: "function def", code: "def ${1:name}(${2:args}):\n    ${3:pass}" },
  { label: "cls", detail: "class def", code: "class ${1:Name}:\n    def __init__(self${2:, args}):\n        ${3:pass}" },
  { label: "init", detail: "__init__", code: "def __init__(self${1:, args}):\n    ${2:pass}" },
  { label: "main", detail: "if __name__", code: 'if __name__ == "__main__":\n    ${1:main()}' },
  { label: "pr", detail: "print", code: "print(${1:value})" },
  { label: "prf", detail: "print f-string", code: 'print(f"${1:msg}: {${2:value}}")' },
  { label: "ifm", detail: "if main", code: "if ${1:condition}:\n    ${2:pass}\nelse:\n    ${3:pass}" },
  { label: "forr", detail: "for range", code: "for ${1:i} in range(${2:n}):\n    ${3:pass}" },
  { label: "fori", detail: "for in", code: "for ${1:item} in ${2:items}:\n    ${3:pass}" },
  { label: "tryx", detail: "try except", code: "try:\n    ${1:pass}\nexcept ${2:Exception} as e:\n    ${3:pass}" },
  { label: "with", detail: "with open", code: 'with open(${1:"file.txt"}${2:, "r"}) as f:\n    ${3:data = f.read()}' },
  { label: "lc", detail: "list comprehension", code: "[${1:x} for ${2:x} in ${3:items}]" },
  { label: "lcf", detail: "list comp with filter", code: "[${1:x} for ${2:x} in ${3:items} if ${4:cond}]" },
  { label: "dc", detail: "dict comprehension", code: "{${1:k}: ${2:v} for ${3:k}, ${4:v} in ${5:items}}" },
  { label: "asn", detail: "async def", code: "async def ${1:name}(${2:args}):\n    ${3:pass}" },
  { label: "awt", detail: "await", code: "await ${1:expr}" },
  { label: "imp", detail: "import", code: "import ${1:module}" },
  { label: "fmp", detail: "from ... import", code: "from ${1:module} import ${2:name}" },
];

const JS_TS: Snip[] = [
  { label: "cl", detail: "console.log", code: "console.log(${1:value});" },
  { label: "cle", detail: "console.error", code: "console.error(${1:value});" },
  { label: "clw", detail: "console.warn", code: "console.warn(${1:value});" },
  { label: "func", detail: "function decl", code: "function ${1:name}(${2:args}) {\n  ${3:return}\n}" },
  { label: "arrow", detail: "arrow fn", code: "const ${1:name} = (${2:args}) => {\n  ${3:return}\n};" },
  { label: "afn", detail: "async fn", code: "const ${1:name} = async (${2:args}) => {\n  ${3:return}\n};" },
  { label: "iife", detail: "IIFE", code: "(() => {\n  ${1}\n})();" },
  { label: "trycatch", detail: "try-catch", code: "try {\n  ${1:body}\n} catch (e: any) {\n  ${2:console.error(e);}\n}" },
  { label: "forr", detail: "for range", code: "for (let ${1:i} = 0; ${1:i} < ${2:n}; ${1:i}++) {\n  ${3:body}\n}" },
  { label: "fori", detail: "for of", code: "for (const ${1:item} of ${2:items}) {\n  ${3:body}\n}" },
  { label: "ife", detail: "if/else", code: "if (${1:cond}) {\n  ${2:body}\n} else {\n  ${3:body}\n}" },
  { label: "tern", detail: "ternary", code: "${1:cond} ? ${2:a} : ${3:b}" },
  { label: "map", detail: "array map", code: "${1:items}.map((${2:item}) => ${3:item})" },
  { label: "filter", detail: "array filter", code: "${1:items}.filter((${2:item}) => ${3:cond})" },
  { label: "reduce", detail: "array reduce", code: "${1:items}.reduce((${2:acc}, ${3:item}) => ${4:acc + item}, ${5:0})" },
  { label: "ftc", detail: "fetch", code: 'const res = await fetch("${1:/api/url}", {\n  method: "${2:GET}",\n  headers: { "Content-Type": "application/json" },\n  ${3:body: JSON.stringify({}),}\n});\nconst data = await res.json();' },
  { label: "use", detail: "useState", code: "const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState(${2:initial});" },
  { label: "uef", detail: "useEffect", code: "useEffect(() => {\n  ${1:body}\n}, [${2:deps}]);" },
  { label: "umm", detail: "useMemo", code: "const ${1:value} = useMemo(() => ${2:compute}, [${3:deps}]);" },
  { label: "rfc", detail: "React component", code: 'export function ${1:Name}() {\n  return (\n    <div>${2:content}</div>\n  );\n}' },
  { label: "rfp", detail: "React with props", code: 'export function ${1:Name}({ ${2:prop} }: { ${2:prop}: ${3:string} }) {\n  return (\n    <div>{${2:prop}}</div>\n  );\n}' },
  { label: "imp", detail: "import", code: 'import { ${1:name} } from "${2:module}";' },
  { label: "expd", detail: "export default", code: "export default ${1:value};" },
];

const HTML: Snip[] = [
  // Emmet 風縮寫
  { label: "!", detail: "HTML5 boilerplate", code: '<!doctype html>\n<html lang="zh-Hant-TW">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>${1:title}</title>\n</head>\n<body>\n  ${2}\n</body>\n</html>' },
  { label: "html5", detail: "HTML5 boilerplate", code: '<!doctype html>\n<html lang="zh-Hant-TW">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>${1:title}</title>\n</head>\n<body>\n  ${2}\n</body>\n</html>' },
  { label: "div", detail: "div", code: '<div${1: class="${2:cls}"}>${3}</div>' },
  { label: "a", detail: "anchor", code: '<a href="${1:#}">${2:text}</a>' },
  { label: "img", detail: "image", code: '<img src="${1:url}" alt="${2:alt}">' },
  { label: "btn", detail: "button", code: '<button onclick="${1}">${2:text}</button>' },
  { label: "in", detail: "input", code: '<input type="${1:text}" name="${2:name}" placeholder="${3}">' },
  { label: "lbl", detail: "label", code: '<label for="${1:id}">${2:text}</label>' },
  { label: "form", detail: "form", code: '<form action="${1}" method="${2:post}">\n  ${3}\n  <button type="submit">${4:Submit}</button>\n</form>' },
  { label: "ul", detail: "ul + li", code: "<ul>\n  <li>${1:item}</li>\n</ul>" },
  { label: "ol", detail: "ol + li", code: "<ol>\n  <li>${1:item}</li>\n</ol>" },
  { label: "tbl", detail: "table", code: '<table>\n  <thead>\n    <tr><th>${1:col}</th></tr>\n  </thead>\n  <tbody>\n    <tr><td>${2:cell}</td></tr>\n  </tbody>\n</table>' },
  { label: "scr", detail: "script", code: '<script>\n  ${1}\n</script>' },
  { label: "scrsrc", detail: "script src", code: '<script src="${1:url}"></script>' },
  { label: "css", detail: "style link", code: '<link rel="stylesheet" href="${1:style.css}">' },
];

const CSS: Snip[] = [
  { label: "fc", detail: "flex center", code: "display: flex;\nalign-items: center;\njustify-content: center;" },
  { label: "fcc", detail: "flex column center", code: "display: flex;\nflex-direction: column;\nalign-items: center;\njustify-content: center;" },
  { label: "gc", detail: "grid centered", code: "display: grid;\nplace-items: center;" },
  { label: "abs", detail: "absolute center", code: "position: absolute;\ntop: 50%;\nleft: 50%;\ntransform: translate(-50%, -50%);" },
  { label: "tr", detail: "transition", code: "transition: ${1:all} ${2:0.2s} ${3:ease};" },
  { label: "an", detail: "animation", code: "@keyframes ${1:name} {\n  from { ${2} }\n  to { ${3} }\n}" },
  { label: "med", detail: "media query", code: "@media (max-width: ${1:768px}) {\n  ${2}\n}" },
  { label: "var", detail: "css variable", code: "--${1:name}: ${2:value};" },
];

const SQL: Snip[] = [
  { label: "sel", detail: "SELECT", code: "SELECT ${1:*}\nFROM ${2:table}\nWHERE ${3:1=1};" },
  { label: "ins", detail: "INSERT", code: "INSERT INTO ${1:table} (${2:cols})\nVALUES (${3:values});" },
  { label: "upd", detail: "UPDATE", code: "UPDATE ${1:table}\nSET ${2:col} = ${3:value}\nWHERE ${4:id} = ${5:?};" },
  { label: "del", detail: "DELETE", code: "DELETE FROM ${1:table} WHERE ${2:id} = ${3:?};" },
  { label: "ct", detail: "CREATE TABLE", code: "CREATE TABLE ${1:name} (\n  id SERIAL PRIMARY KEY,\n  ${2:col} TEXT NOT NULL,\n  created_at TIMESTAMPTZ DEFAULT NOW()\n);" },
  { label: "join", detail: "INNER JOIN", code: "INNER JOIN ${1:other} ON ${1:other}.${2:fk} = ${3:t}.${4:id}" },
  { label: "lj", detail: "LEFT JOIN", code: "LEFT JOIN ${1:other} ON ${1:other}.${2:fk} = ${3:t}.${4:id}" },
  { label: "gb", detail: "GROUP BY", code: "GROUP BY ${1:col}" },
  { label: "ob", detail: "ORDER BY", code: "ORDER BY ${1:col} ${2:DESC}" },
  { label: "cte", detail: "WITH (CTE)", code: "WITH ${1:cte_name} AS (\n  SELECT ${2:cols}\n  FROM ${3:table}\n)\nSELECT * FROM ${1:cte_name};" },
];

const JSON_SNIPS: Snip[] = [
  { label: "obj", detail: "empty object", code: '{\n  "${1:key}": ${2:value}\n}' },
  { label: "arr", detail: "empty array", code: "[\n  ${1}\n]" },
];

const MARKDOWN: Snip[] = [
  { label: "h1", detail: "heading 1", code: "# ${1:title}" },
  { label: "h2", detail: "heading 2", code: "## ${1:title}" },
  { label: "h3", detail: "heading 3", code: "### ${1:title}" },
  { label: "link", detail: "link", code: "[${1:text}](${2:url})" },
  { label: "img", detail: "image", code: "![${1:alt}](${2:url})" },
  { label: "code", detail: "code block", code: "```${1:lang}\n${2}\n```" },
  { label: "tbl", detail: "table", code: "| ${1:col1} | ${2:col2} |\n|---|---|\n| ${3} | ${4} |" },
];

const BY_LANG: Record<string, Snip[]> = {
  python: PYTHON,
  javascript: JS_TS,
  typescript: JS_TS,
  jsx: JS_TS,
  tsx: JS_TS,
  html: HTML,
  css: CSS,
  sql: SQL,
  json: JSON_SNIPS,
  markdown: MARKDOWN,
};

/** 給 CodeMirror autocomplete 用 — 把 snippet 轉成 Completion array */
export function snippetsForLang(lang: CodeLang): Completion[] {
  const snips = BY_LANG[lang] ?? [];
  return snips.map((s) =>
    snippetCompletion(s.code, {
      label: s.label,
      detail: s.detail,
      type: "snippet",
      boost: 99, // 排在 keyword 之上
    }),
  );
}

/** 給 admin 介面 / cheat-sheet 顯示 */
export function getAllSnippetsForLang(lang: CodeLang): Array<{ label: string; detail: string; code: string }> {
  return (BY_LANG[lang] ?? []).map((s) => ({ label: s.label, detail: s.detail, code: s.code.replace(/\$\{[^}]+\}/g, "…") }));
}
