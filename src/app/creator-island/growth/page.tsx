import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { ComingSoon } from "@/components/creator-island/ComingSoon";

export const dynamic = "force-dynamic";

export default async function GrowthPage() {
  if (!(await isCreatorIslandEnabled())) return <FeatureOffNotice title="🎨 創作者島嶼即將開放" />;
  return (
    <ComingSoon emoji="📈" title="成長" desc="記錄你怎麼變強：創作 DNA、技能圖、時間軸、AI 教練週報（建設性、不羞辱）。"
      previews={["創作 DNA（風格指紋）", "技能圖 / 趨勢", "創作時間軸・里程碑", "AI 教練週報"]} />
  );
}
