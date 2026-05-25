import { VscodeIDE } from "./VscodeIDE";

export const dynamic = "force-dynamic";

/**
 * Nami IDE — 真正 VSCode 風線上 IDE
 *
 * 跟 /admin/nami-playground 內的 MiniIDE 不一樣 (那個是 flat file list):
 * - 左側 file tree、folder hierarchy
 * - 新增檔案 / 資料夾 / 重新命名 / 刪除
 * - 多 tab 編輯
 * - 自動依檔名分流 runner (.py / .sql / .html+css+js / .js)
 * - 全部 autosave 到 localStorage、重整還在
 */
export default function NamiIDEPage() {
  return <VscodeIDE />;
}
