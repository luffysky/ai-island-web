import Link from "next/link";
import { WifiOff, Home, BookOpen } from "lucide-react";

export const metadata = {
  title: "離線了 | AI 島",
  description: "目前沒網路、看看快取的章節或重整頁面。",
};

export default function OfflinePage() {
  return (
    <div className="max-w-md mx-auto px-6 py-16 text-center space-y-6">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-bg-card border border-border">
        <WifiOff size={36} className="text-fg-muted" />
      </div>
      <div>
        <h1 className="text-2xl font-bold mb-2">📡 離線了</h1>
        <p className="text-sm text-fg-muted leading-relaxed">
          目前沒網路、本頁無法載入。
          <br />
          回首頁可以看之前快取的章節、有空再重整。
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Link
          href="/"
          className="px-5 py-2.5 rounded-full bg-accent text-black font-bold text-sm inline-flex items-center justify-center gap-1"
        >
          <Home size={14} /> 回首頁
        </Link>
        <Link
          href="/chapters"
          className="px-5 py-2.5 rounded-full border border-border hover:border-accent text-sm inline-flex items-center justify-center gap-1"
        >
          <BookOpen size={14} /> 看章節
        </Link>
      </div>
      <p className="text-[11px] text-fg-muted leading-relaxed">
        💡 已安裝為 PWA 的話、離線也能看曾經開過的章節。
      </p>
    </div>
  );
}
