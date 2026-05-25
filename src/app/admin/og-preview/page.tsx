import { OgPreviewClient } from "./OgPreviewClient";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

export default function OgPreviewPage() {
  return (
    <div className="space-y-4">
      <PageHero
        emoji="🎨"
        title="AI OG 圖預覽 / 切 model"
        desc="5 個免費 AI 生圖 API (Pollinations / Cloudflare / Together / HF / Replicate)、可比較同 prompt 不同 provider 效果。設好 env 按生成即時看圖。"
        gradient="from-purple-500/10 via-pink-500/10 to-rose-500/10"
        borderColor="border-purple-500/30"
      >
        <a
          href="/api/og/ai/debug"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 rounded-full border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 inline-flex items-center gap-1 whitespace-nowrap"
        >
          🩺 診斷 env + ping
        </a>
      </PageHero>
      <OgPreviewClient />
    </div>
  );
}
