import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { ComingSoon } from "@/components/creator-island/ComingSoon";

export const dynamic = "force-dynamic";

export default async function CommunityPage() {
  if (!(await isCreatorIslandEnabled())) return <FeatureOffNotice title="🎨 創作者島嶼即將開放" />;
  return (
    <ComingSoon emoji="🌐" title="社群" desc="以作品為核心的創作生態：追蹤、收藏、Fork / Remix（記 lineage）、挑戰。"
      previews={["追蹤創作者 / 工作室", "Fork・Remix（自動記來源）", "創作者主頁・作品展示", "主題挑戰"]} />
  );
}
