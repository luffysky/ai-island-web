"use client";

// 輸入框「Enter 送出／換行」的統一行為（AI 對話、留言、私訊都用這支）。
//
// 為什麼要有這支：手機/平板觸控鍵盤「沒有 Shift 鍵」，若沿用桌機的
// 「Enter 送出、Shift+Enter 換行」，手機使用者永遠無法換行 → 貼多行程式碼時
// 問句會跟程式碼黏在一起（Nami 回報的正是這個）。
//
// 規則：
//  - 桌機（fine pointer）：Enter 送出、Shift+Enter 換行。
//  - 手機（coarse pointer）：Enter 一律換行，改用「送出鈕」提交 → 才能貼多行/分段。
//  - 中日韓輸入法組字中（isComposing / keyCode 229）一律不攔截，避免選字時誤送。

/** 粗指標裝置（觸控手機/平板）：沒有 Shift 鍵、不該用 Enter 送出 */
export function isCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.matchMedia?.("(pointer: coarse)").matches;
}

/**
 * 綁在 textarea/input 的 onKeyDown。桌機 Enter 送出、Shift+Enter 換行；
 * 手機 Enter 換行（靠送出鈕）。組字中不送。
 * 回傳 true 表示「已攔截並送出」，呼叫端通常不用管回傳值。
 */
export function handleEnterSubmit(
  e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>,
  submit: () => void,
): boolean {
  if (e.key !== "Enter" || e.shiftKey) return false;
  // 中日韓輸入法組字中（選字）：Enter 是「確定候選字」、不能當送出
  const ne = e.nativeEvent as any;
  if (ne?.isComposing || ne?.keyCode === 229) return false;
  if (isCoarsePointer()) return false; // 手機：Enter=換行
  e.preventDefault();
  submit();
  return true;
}

/** textarea 隨內容自動長高（上限 maxPx），貼多行時看得到全部 */
export function autoGrow(el: HTMLTextAreaElement | null, maxPx = 160) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, maxPx) + "px";
}
