import Link from "next/link";

// 功能被後台關閉時顯示（feature_*_enabled = false）。
export function FeatureOffNotice({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="max-w-md mx-auto px-6 py-24 text-center">
      <div className="text-5xl mb-4">🚧</div>
      <h1 className="text-xl font-bold mb-2">{title}</h1>
      <p className="text-sm text-fg-muted mb-6">{desc || "此功能目前暫時關閉，稍後再來看看。"}</p>
      <Link href="/" className="inline-block px-4 py-2 rounded-full bg-accent text-black font-bold text-sm">
        ← 回首頁
      </Link>
    </div>
  );
}
