import type { Metadata } from "next";
import { OpportunityBrowse } from "./OpportunityBrowse";

export const metadata: Metadata = {
  title: "機會島 — 競賽 · 補助 · 創投雷達 | AI 島",
  description: "找到適合你的競賽、補助、創投與徵件機會，加入「我的航線」追蹤截止日。AI 島的機會中心。",
  alternates: { canonical: "/opportunities" },
};

export const dynamic = "force-dynamic";

export default function OpportunitiesPage() {
  return <OpportunityBrowse />;
}
