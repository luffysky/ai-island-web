"use client";

import { useState } from "react";
import { ASSISTANT_LABEL, type AssistantMode } from "@/lib/ai-assistant";
import { AssistantPanel } from "@/components/AssistantPanel";

const MODES: AssistantMode[] = ["grade_draft", "hint", "recommend", "companion"];

export function AssistantHub() {
  const [mode, setMode] = useState<AssistantMode>("companion");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {MODES.map((m) => {
          const meta = ASSISTANT_LABEL[m];
          const active = mode === m;
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`text-left rounded-xl border p-3 transition ${active ? "border-accent bg-accent/10" : "border-border bg-bg-card hover:border-accent/40"}`}
            >
              <div className="text-2xl mb-1">{meta.emoji}</div>
              <div className="font-bold text-sm">{meta.name}</div>
              <div className="text-[10px] text-fg-muted leading-snug mt-0.5">{meta.desc}</div>
            </button>
          );
        })}
      </div>
      <AssistantPanel mode={mode} inline placeholder={PLACEHOLDER[mode]} />
      <div className="text-[10px] text-fg-muted text-center">
        每用戶 30 次/分鐘、走免費 quota（升級 Premium 無上限）
      </div>
    </div>
  );
}

const PLACEHOLDER: Record<AssistantMode, string> = {
  grade_draft: "貼上你寫到一半的作業 / 段落、要 AI 預批",
  hint:        "貼題目 + 你的卡點、要方向提示（不會給答案）",
  recommend:   "說你最近錯哪類型題目 / 學到哪、要下一輪推薦",
  companion:   "想跟誰聊聊？學習挫折 / 想休息 / 計畫煩惱都可",
};
