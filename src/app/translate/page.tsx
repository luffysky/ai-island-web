import type { Metadata } from "next";
import { TranslatorClient } from "./TranslatorClient";

export const metadata: Metadata = {
  title: "翻譯器 — 世界各國語言即時翻譯 | AI 島",
  description: "AI 島站內翻譯器，支援世界各國語言即時互譯，免費好用。",
  alternates: { canonical: "/translate" },
};

export default function TranslatePage() {
  return <TranslatorClient />;
}
