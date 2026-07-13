import type { Metadata } from "next";
import { RadarClient } from "./RadarClient";

export const metadata: Metadata = { title: "機會雷達來源 / 待審 — 後台" };
export const dynamic = "force-dynamic";

// admin layout 已做 owner/admin gate；此頁再包一層 client 管理 UI。
export default function RadarSourcesPage() {
  return <RadarClient />;
}
