"use client";

import { useEffect, useState } from "react";
import { Download, Check, Loader2 } from "lucide-react";

const KEY = "offline_chapters";

export function OfflineSaveButton({ chapterId }: { chapterId: number }) {
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const arr: number[] = JSON.parse(localStorage.getItem(KEY) || "[]");
      setSaved(arr.includes(chapterId));
    } catch {}
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "OFFLINE_SAVED" && e.data.ok) { mark(true); setBusy(false); }
      else if (e.data?.type === "OFFLINE_SAVED" && !e.data.ok) { setBusy(false); }
      else if (e.data?.type === "OFFLINE_REMOVED") { mark(false); setBusy(false); }
    };
    navigator.serviceWorker?.addEventListener("message", onMsg);
    return () => navigator.serviceWorker?.removeEventListener("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);

  const mark = (on: boolean) => {
    try {
      const arr: number[] = JSON.parse(localStorage.getItem(KEY) || "[]");
      const next = on ? Array.from(new Set([...arr, chapterId])) : arr.filter((x) => x !== chapterId);
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    setSaved(on);
  };

  const toggle = async () => {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.ready.catch(() => null);
    if (!reg?.active) return;
    setBusy(true);
    const url = `${location.origin}/chapters/${chapterId}`;
    reg.active.postMessage({ type: saved ? "OFFLINE_REMOVE" : "OFFLINE_SAVE", url });
    setTimeout(() => setBusy(false), 3000); // 保險：SW 沒回也解鎖
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={saved ? "已存離線、點可移除" : "存起來、離線（地鐵/飛機）也能看這章"}
      className={`text-[10px] px-2 py-1 rounded mr-1 flex items-center gap-1 transition ${
        saved ? "bg-green-500/15 text-green-600 dark:text-green-300" : "bg-bg-elevated text-fg-muted hover:text-accent"
      }`}
    >
      {busy ? <Loader2 size={11} className="animate-spin" /> : saved ? <Check size={11} /> : <Download size={11} />}
      {saved ? "已離線" : "存離線"}
    </button>
  );
}
