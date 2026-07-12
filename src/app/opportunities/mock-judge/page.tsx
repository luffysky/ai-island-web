import type { Metadata } from "next";
import { MockJudgeClient } from "./MockJudgeClient";

export const metadata: Metadata = {
  title: "AI 模擬評審 — 機會島 | AI 島",
  description: "貼上作品/簡報，AI 評審像決賽 Q&A 一樣犀利追問，最後給評分與準備建議。練膽、找盲點。",
  alternates: { canonical: "/opportunities/mock-judge" },
};

export const dynamic = "force-dynamic";

export default function MockJudgePage() {
  return <MockJudgeClient />;
}
