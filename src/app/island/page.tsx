import Link from "next/link";

export const metadata = {
  title: "🏝️ AI 島 · 3D 島嶼模式（v0 建設中）",
};

/**
 * v0 佔位頁。
 * 真正的 3D 島嶼依 docs/待閱/AI島_3D島嶼_規格書 v0 在 Sprint S7-S8 實作。
 */
export default function IslandPlaceholderPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-7xl mb-4 animate-bounce">🏝️</div>
        <h1 className="text-3xl font-bold mb-2">島嶼模式 v0 建設中</h1>
        <p className="text-sm text-fg-muted leading-relaxed mb-6">
          3D 沉浸式島嶼正在打造中、預計 Sprint S7-S8 上線。
          <br />
          屆時你能操控角色在島上走動、寵物跟著你、AI 居民會跟你對話、走到節點進入章節。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/chapters"
            className="px-6 py-3 rounded-lg bg-accent text-black font-bold hover:scale-105 transition"
          >
            📋 先用經典模式開始學
          </Link>
          <Link
            href="/"
            className="px-6 py-3 rounded-lg border border-border hover:border-accent"
          >
            ← 回首頁
          </Link>
        </div>
        <p className="text-[10px] text-fg-muted mt-6">
          參考規格：docs/待閱/AI島_3D島嶼_規格書_SnowRealm版.md
        </p>
      </div>
    </div>
  );
}
