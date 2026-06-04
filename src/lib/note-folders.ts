/**
 * 筆記資料夾（= 分類 category）清單。
 * 分類本身存在 notes.category（DB），但「空資料夾」也要能先建好等你拖筆記進來，
 * 所以資料夾名單放 localStorage（個人偏好、免再加一張表 / 免再跑 migration）。
 * 實際畫面上的資料夾 = localStorage 名單 ∪ 現有筆記用到的 category。
 */
const LS_KEY = "note-folders-v1";

export function loadFolders(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function saveFolders(list: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {
    /* localStorage 滿了就算了 */
  }
}

/** drop 目標 id 編碼：folder::<name>，未分類用 folder::__none__ */
export const FOLDER_DROP_PREFIX = "folder::";
export const UNCATEGORIZED = "__none__";
export const folderDropId = (name: string) => `${FOLDER_DROP_PREFIX}${name}`;
