import { CopyGeneratorClient } from "./CopyGeneratorClient";
import { PageHero } from "@/components/admin/PageHero";

export const dynamic = "force-dynamic";

export default function CopyGeneratorPage() {
  return (
    <div className="space-y-4">
      <PageHero
        emoji="📝"
        title="AI 文案產生器"
        desc="給一個主題、AI 自動生 7 個平台 (FB / IG / X / Threads / LINE / Email / Blog) 各自合適 copy。套品牌 voice + UTM、可存草稿或排程發佈。"
        gradient="from-pink-500/10 via-rose-500/10 to-red-500/10"
        borderColor="border-pink-500/30"
      />
      <CopyGeneratorClient />
    </div>
  );
}
