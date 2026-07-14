import type { Metadata } from "next";
import { SocialClient } from "./SocialClient";

export const metadata: Metadata = {
  title: "社群媒體發布中心 | AI 島",
  description: "一個地方寫、選平台、排程發布、看紀錄；AI 起草→你批准→發。",
};

export default function SocialPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 w-full">
      <SocialClient />
    </div>
  );
}
