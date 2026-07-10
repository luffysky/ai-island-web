import type { Metadata } from "next";
import { DictionaryBrowse } from "./DictionaryBrowse";
import { DictHero } from "./DictHero";

export const metadata: Metadata = {
  title: "程式辭典 — AI 島",
  description: "繁體中文、白話解釋的程式術語、語法與工程師黑話辭典。看不懂術語就不敢開始？從 async 到「技術債」「小黃鴨除錯法」，用人話＋生活比喻秒懂。",
  alternates: { canonical: "/dictionary" },
};

export default function DictionaryPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <DictHero />
      <DictionaryBrowse />
    </main>
  );
}
