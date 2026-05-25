import { CopyGeneratorClient } from "./CopyGeneratorClient";

export const dynamic = "force-dynamic";

export default function CopyGeneratorPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">📝 AI 文案產生器</h1>
        <p className="text-xs text-fg-muted mt-1 leading-relaxed">
          給一個主題、AI 自動生 7 個平台 (FB / IG / X / Threads / LINE / Email subject / Blog 標題) 各自合適的 copy。
          套用站內品牌 voice、含 hashtag、自動帶 UTM 連結。生完可選一鍵存草稿、或排程發佈。
        </p>
      </div>
      <CopyGeneratorClient />
    </div>
  );
}
