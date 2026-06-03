/**
 * 終端機指令小抄
 *
 * 新手第一次碰電腦，看到 mkdir / cd / ls 完全不知道是什麼。
 * 章節頁的程式碼區塊若判斷為「終端機指令」，會自動掃出用到的指令，
 * 在下方列出白話解說（不用每一章手動補）。
 */
export const CLI_GLOSSARY: Record<string, string> = {
  mkdir: "建立一個新資料夾（make directory）",
  cd: "進入某個資料夾（change directory）；cd .. 是回上一層",
  ls: "列出目前資料夾裡有哪些檔案和資料夾（list）",
  dir: "列出目前資料夾的內容（Windows 版的 ls）",
  pwd: "顯示「我現在在哪個資料夾」（print working directory）",
  touch: "建立一個空白檔案",
  rm: "刪除檔案（remove）；⚠️ 不會進資源回收桶、刪了就沒了",
  rmdir: "刪除空資料夾",
  cp: "複製檔案（copy）",
  mv: "移動檔案，或拿來改檔名（move）",
  cat: "把檔案內容直接印在畫面上看",
  echo: "把後面那串文字印出來",
  clear: "清空終端機畫面（畫面太亂時用）",
  cls: "清空畫面（Windows 版的 clear）",
  npm: "Node 的套件管理員——安裝/管理專案要用的工具",
  npx: "直接執行某個套件、不用先安裝",
  pnpm: "另一款更快的套件管理員（npm 的替代品）",
  yarn: "另一款套件管理員（npm 的替代品）",
  node: "執行 JavaScript 檔案",
  python: "執行 Python 程式",
  python3: "執行 Python 程式（指定第 3 版）",
  pip: "Python 的套件管理員——安裝 Python 要用的工具",
  pip3: "Python 套件管理員（第 3 版）",
  git: "版本控制——幫你的程式碼存檔、紀錄每次修改",
  code: "用 VS Code 打開檔案或資料夾（code . 是開目前這個資料夾）",
  curl: "從一個網址抓資料下來",
  wget: "從網址下載檔案",
  open: "用預設程式打開檔案（Mac）",
  start: "用預設程式打開檔案（Windows）",
  sudo: "用「管理員權限」執行（Mac/Linux）；通常會問你密碼",
  brew: "Mac 上的軟體安裝工具（Homebrew）",
  export: "設定一個環境變數（給程式讀的設定值）",
  source: "重新載入設定檔，讓剛改的設定生效",
  chmod: "修改檔案的權限（誰可以讀/寫/執行）",
  vim: "終端機裡的文字編輯器（按 :q 離開）",
  nano: "終端機裡比較好上手的文字編輯器",
  ssh: "遠端連線到另一台電腦",
  docker: "把程式裝進「容器」裡執行，環境到哪都一樣",
  cargo: "Rust 的套件管理 / 建置工具",
  go: "執行 Go 程式",
  java: "執行 Java 程式",
  javac: "把 Java 原始碼編譯成可執行檔",
};

// 看起來像終端機指令的開頭關鍵字（用來判斷一個程式碼區塊是不是終端機）
const TERMINAL_HINTS = new Set(Object.keys(CLI_GLOSSARY));

/** 從一段程式碼文字判斷「這是不是終端機指令區塊」，並抽出用到的已知指令 */
export function extractCliCommands(text: string): string[] {
  const found = new Set<string>();
  const lines = text.split("\n");
  for (const raw of lines) {
    // 去掉開頭的 $ 或 > 提示符號
    const line = raw.replace(/^\s*[$>#]\s*/, "").trim();
    if (!line) continue;
    const first = line.split(/\s+/)[0];
    if (TERMINAL_HINTS.has(first)) found.add(first);
  }
  return [...found];
}

/** 終端機區塊判定：開啟註解的語言、或內容前幾行就是已知指令 */
export function looksLikeTerminal(lang: string | undefined, text: string): boolean {
  if (lang && ["bash", "sh", "shell", "zsh", "console", "terminal", "powershell", "ps1", "bat", "cmd"].includes(lang)) {
    return true;
  }
  return extractCliCommands(text).length > 0;
}
