import { AssistantHub } from "./AssistantHub";

export const dynamic = "force-dynamic";

export const metadata = { title: "AI 助教 | AI 島" };

export default function AssistantPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">🤝 AI 助教</h1>
        <p className="text-sm text-fg-muted mt-1">
          跟 AI 導師（綠寶）不同 — 助教專做「預批 / 提示 / 練習推薦 / 學伴陪聊」
        </p>
      </header>
      <AssistantHub />
    </div>
  );
}
