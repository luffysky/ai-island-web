import { isCreatorIslandEnabled } from "@/lib/app-settings";
import { FeatureOffNotice } from "@/components/FeatureOffNotice";
import { ComingSoon } from "@/components/creator-island/ComingSoon";

export const dynamic = "force-dynamic";

export default async function MarketPage() {
  if (!(await isCreatorIslandEnabled())) return <FeatureOffNotice title="🎨 創作者島嶼即將開放" />;
  return (
    <ComingSoon emoji="🏪" title="市集" desc="把你的碎片包、提示詞包、工作流上架，用 Z 幣交易（第一階段站內經濟）。"
      previews={["碎片包 / 提示詞包 / 工作流包", "授權 + 收益分潤（平台費）", "評價・排行", "Z 幣購買（真金流為未來）"]} />
  );
}
