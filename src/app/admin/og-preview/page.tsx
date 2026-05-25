import { OgPreviewClient } from "./OgPreviewClient";

export const dynamic = "force-dynamic";

export default function OgPreviewPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">🎨 AI OG 圖預覽 / 切 model</h1>
          <p className="text-xs text-fg-muted mt-1 leading-relaxed">
            5 個免費 AI 生圖 API、可比較同 prompt 不同 provider 效果。
            設好 env 變數 (見每個 provider 卡的「設定」)、按「生成」即時看圖。<br />
            要把哪家設成站台預設、改 chapter / blog metadata 用對應 URL 即可。
          </p>
        </div>
        <a
          href="/api/og/ai/debug"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 rounded-full border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 inline-flex items-center gap-1 whitespace-nowrap"
        >
          🩺 診斷 env + ping
        </a>
      </div>
      <OgPreviewClient />
    </div>
  );
}
