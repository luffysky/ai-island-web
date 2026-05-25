/**
 * 虛擬檔案系統 — 給 VscodeIDE 用
 *
 * 結構：folder 跟 file 用 recursive tree、path 用 "/" 串
 * 例：
 *   src/main.py
 *   src/utils/helper.py
 *   tests/test_main.py
 *
 * 持久化：JSON 存 localStorage、key = "nami-vscode-fs"
 */

export type FsNode =
  | { type: "file"; name: string; content: string }
  | { type: "folder"; name: string; children: FsNode[]; expanded?: boolean };

export type FsTree = FsNode[];

const STORAGE_KEY = "nami-vscode-fs";
const ACTIVE_KEY = "nami-vscode-active";
const OPEN_TABS_KEY = "nami-vscode-tabs";

export const DEFAULT_TREE: FsTree = [
  {
    type: "folder",
    name: "src",
    expanded: true,
    children: [
      {
        type: "file",
        name: "main.py",
        content: `# main.py — 入口
from utils.helper import greet
from data.users import load_users

print(greet("Nami"))

users = load_users()
print(f"\\n載入 {len(users)} 個 user：")
for u in users:
    print(f"  - {u['name']} ({u['age']}歲)")
`,
      },
      {
        type: "folder",
        name: "utils",
        expanded: false,
        children: [
          {
            type: "file",
            name: "helper.py",
            content: `# utils/helper.py
def greet(name):
    return f"👋 哈囉 {name}！這是 VSCode 風 IDE。"

def add(a, b):
    return a + b
`,
          },
        ],
      },
      {
        type: "folder",
        name: "data",
        expanded: false,
        children: [
          {
            type: "file",
            name: "users.py",
            content: `# data/users.py
def load_users():
    return [
        {"id": 1, "name": "Alice", "age": 25},
        {"id": 2, "name": "Bob",   "age": 30},
        {"id": 3, "name": "Carol", "age": 28},
    ]
`,
          },
        ],
      },
    ],
  },
  {
    type: "folder",
    name: "web",
    expanded: false,
    children: [
      {
        type: "file",
        name: "index.html",
        content: `<!doctype html>
<html>
<head><meta charset="utf-8"><title>Demo</title></head>
<body>
  <h1>Hello from IDE</h1>
  <button id="btn">點我</button>
  <p id="out"></p>
</body>
</html>`,
      },
      {
        type: "file",
        name: "style.css",
        content: `body { font-family: sans-serif; padding: 20px; background: #0d1117; color: #e6edf3; }
button { padding: 8px 16px; background: #8b5cf6; color: white; border: none; border-radius: 8px; cursor: pointer; }
button:hover { background: #a78bfa; }
#out { margin-top: 12px; color: #50fa7b; }`,
      },
      {
        type: "file",
        name: "app.js",
        content: `document.getElementById("btn").addEventListener("click", () => {
  document.getElementById("out").textContent = "JS hooked + iframe sandbox ✨";
  console.log("clicked at", new Date());
});`,
      },
    ],
  },
  {
    type: "folder",
    name: "sql",
    expanded: false,
    children: [
      {
        type: "file",
        name: "schema.sql",
        content: `-- SQLite 範例
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE
);

INSERT INTO users (name, email) VALUES
  ('Alice', 'alice@ex.com'),
  ('Bob',   'bob@ex.com');

SELECT * FROM users;
`,
      },
    ],
  },
];

export function loadFs(): FsTree {
  if (typeof window === "undefined") return DEFAULT_TREE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_TREE;
}

export function saveFs(tree: FsTree) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tree));
  } catch {}
}

export function loadActive(): string {
  if (typeof window === "undefined") return "src/main.py";
  try {
    return localStorage.getItem(ACTIVE_KEY) ?? "src/main.py";
  } catch {
    return "src/main.py";
  }
}

export function saveActive(path: string) {
  try { localStorage.setItem(ACTIVE_KEY, path); } catch {}
}

export function loadOpenTabs(): string[] {
  if (typeof window === "undefined") return ["src/main.py"];
  try {
    const raw = localStorage.getItem(OPEN_TABS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return ["src/main.py"];
}

export function saveOpenTabs(tabs: string[]) {
  try { localStorage.setItem(OPEN_TABS_KEY, JSON.stringify(tabs)); } catch {}
}

/** path 用 "/" 切、找節點 — 回傳 [parent children array, node, index] */
export function findNode(
  tree: FsTree,
  path: string,
): { parent: FsTree; node: FsNode; index: number } | null {
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  let cur: FsTree = tree;
  let parent: FsTree = tree;
  let node: FsNode | null = null;
  let index = -1;
  for (let i = 0; i < parts.length; i++) {
    const name = parts[i];
    const idx = cur.findIndex((n) => n.name === name);
    if (idx < 0) return null;
    parent = cur;
    node = cur[idx];
    index = idx;
    if (i < parts.length - 1) {
      if (node.type !== "folder") return null;
      cur = node.children;
    }
  }
  return node ? { parent, node, index } : null;
}

/** 列出所有檔案路徑 (flat、深度優先) */
export function listAllFiles(tree: FsTree, prefix = ""): Array<{ path: string; content: string }> {
  const out: Array<{ path: string; content: string }> = [];
  for (const n of tree) {
    const p = prefix ? `${prefix}/${n.name}` : n.name;
    if (n.type === "file") {
      out.push({ path: p, content: n.content });
    } else {
      out.push(...listAllFiles(n.children, p));
    }
  }
  return out;
}

/** 從 path 拿副檔名 */
export function getExt(path: string): string {
  const i = path.lastIndexOf(".");
  if (i < 0) return "";
  return path.slice(i + 1).toLowerCase();
}

export function langForExt(ext: string): "python" | "javascript" | "typescript" | "html" | "css" | "sql" | "json" | "markdown" {
  if (ext === "py") return "python";
  if (ext === "js" || ext === "mjs") return "javascript";
  if (ext === "ts") return "typescript";
  if (ext === "tsx") return "typescript";
  if (ext === "jsx") return "javascript";
  if (ext === "html" || ext === "htm") return "html";
  if (ext === "css") return "css";
  if (ext === "sql") return "sql";
  if (ext === "json") return "json";
  if (ext === "md") return "markdown";
  return "javascript";
}

/** 更新某個 file 的 content (immutable) */
export function updateFileContent(tree: FsTree, path: string, content: string): FsTree {
  const parts = path.split("/").filter(Boolean);
  const walk = (nodes: FsTree, depth: number): FsTree => {
    return nodes.map((n) => {
      if (n.name !== parts[depth]) return n;
      if (depth === parts.length - 1) {
        if (n.type === "file") return { ...n, content };
        return n;
      }
      if (n.type === "folder") {
        return { ...n, children: walk(n.children, depth + 1) };
      }
      return n;
    });
  };
  return walk(tree, 0);
}

/** 在 parentPath (folder path 或 "" 表 root) 新增 file 或 folder */
export function addNode(tree: FsTree, parentPath: string, node: FsNode): FsTree {
  if (!parentPath) {
    if (tree.some((n) => n.name === node.name)) throw new Error("名稱已存在");
    return [...tree, node];
  }
  const parts = parentPath.split("/").filter(Boolean);
  const walk = (nodes: FsTree, depth: number): FsTree => {
    return nodes.map((n) => {
      if (n.name !== parts[depth]) return n;
      if (depth === parts.length - 1) {
        if (n.type !== "folder") throw new Error("不是資料夾");
        if (n.children.some((c) => c.name === node.name)) throw new Error("名稱已存在");
        return { ...n, expanded: true, children: [...n.children, node] };
      }
      if (n.type === "folder") {
        return { ...n, children: walk(n.children, depth + 1) };
      }
      return n;
    });
  };
  return walk(tree, 0);
}

/** 刪除 path 對應的節點 */
export function deleteNode(tree: FsTree, path: string): FsTree {
  const parts = path.split("/").filter(Boolean);
  const walk = (nodes: FsTree, depth: number): FsTree => {
    return nodes
      .filter((n) => {
        if (depth === parts.length - 1) return n.name !== parts[depth];
        return true;
      })
      .map((n) => {
        if (n.name !== parts[depth] || depth >= parts.length - 1) return n;
        if (n.type === "folder") return { ...n, children: walk(n.children, depth + 1) };
        return n;
      });
  };
  return walk(tree, 0);
}

/** 重新命名 path 對應的節點 */
export function renameNode(tree: FsTree, path: string, newName: string): FsTree {
  if (!/^[a-zA-Z0-9_.-]+$/.test(newName)) throw new Error("名稱只能英數 + _ - .");
  const parts = path.split("/").filter(Boolean);
  const walk = (nodes: FsTree, depth: number): FsTree => {
    return nodes.map((n) => {
      if (n.name !== parts[depth]) return n;
      if (depth === parts.length - 1) {
        // 同層不能撞名
        if (nodes.some((other) => other !== n && other.name === newName)) {
          throw new Error("同層已有此名");
        }
        return { ...n, name: newName };
      }
      if (n.type === "folder") {
        return { ...n, children: walk(n.children, depth + 1) };
      }
      return n;
    });
  };
  return walk(tree, 0);
}

/** Toggle folder expanded */
export function toggleFolder(tree: FsTree, path: string): FsTree {
  const parts = path.split("/").filter(Boolean);
  const walk = (nodes: FsTree, depth: number): FsTree => {
    return nodes.map((n) => {
      if (n.name !== parts[depth]) return n;
      if (depth === parts.length - 1) {
        if (n.type === "folder") return { ...n, expanded: !n.expanded };
        return n;
      }
      if (n.type === "folder") {
        return { ...n, children: walk(n.children, depth + 1) };
      }
      return n;
    });
  };
  return walk(tree, 0);
}
