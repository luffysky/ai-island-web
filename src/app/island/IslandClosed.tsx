import Link from "next/link";

/**
 * 島嶼關閉時的「敬請期待」頁。
 * - 管理員可在 /admin/settings 切換 island_enabled
 * - admin 不會看到這頁、會直接進島
 */
export default function IslandClosed() {
  return (
    <main className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-4 animate-pulse">🏝️</div>
        <h1 className="text-2xl font-bold mb-2">AI 島嶼籌備中</h1>
        <p className="text-fg-muted text-sm mb-6 leading-relaxed">
          雪境 AI 島嶼正在打磨中、寵物、3D 場景、社交還在最後測試。
          <br />
          敬請期待正式開放～
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link
            href="/chapters"
            className="px-5 py-2.5 bg-accent text-black font-bold rounded-xl text-sm hover:opacity-90 transition"
          >
            📚 先去看課程
          </Link>
          <Link
            href="/"
            className="px-5 py-2.5 bg-bg-elevated border border-border rounded-xl text-sm hover:border-accent transition"
          >
            🏠 回首頁
          </Link>
        </div>
        <p className="text-[10px] text-fg-muted mt-8">
          想第一時間知道開放消息？
          <Link href="/account/notifications" className="text-accent underline ml-1">
            開啟通知
          </Link>
        </p>
      </div>
    </main>
  );
}
