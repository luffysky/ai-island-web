"use client";
import type { LessonDemo } from "@/lib/types";
import { Sparkles } from "lucide-react";
import { LayoutGallery } from "./LayoutGallery";
import { FlexPlayground } from "./FlexPlayground";
import { GridPlayground } from "./GridPlayground";
import { RwdRuler } from "./RwdRuler";
import { PromptLab } from "./PromptLab";
import { BoxModel } from "./BoxModel";
import { PromptBuilder } from "./PromptBuilder";
import { FunnelSim } from "./FunnelSim";
import { DecisionQuiz } from "./DecisionQuiz";
import { ScenarioJudge } from "./ScenarioJudge";
import { PriorityMatrix } from "./PriorityMatrix";
import { ColorContrast } from "./ColorContrast";
import { AgentLoop } from "./AgentLoop";
import { WorkflowFlow } from "./WorkflowFlow";

const SUPPORTED = new Set<LessonDemo["type"]>(["css-layout", "rwd-ruler", "flex-playground", "grid-playground", "prompt-lab", "box-model", "prompt-builder", "funnel-sim", "decision-quiz", "scenario-judge", "priority-matrix", "color-contrast", "agent-loop", "workflow-flow"]);

/**
 * 依 demo.type 派發到對應的互動教具元件。
 * 未知/未實作型別直接略過（不炸畫面），方便之後逐一補齊新教具。
 */
function DemoRenderer({ demo }: { demo: LessonDemo }) {
  switch (demo.type) {
    case "css-layout":
      return <LayoutGallery title={demo.title} note={demo.note} />;
    case "rwd-ruler":
      return <RwdRuler title={demo.title} note={demo.note} />;
    case "flex-playground":
      return <FlexPlayground title={demo.title} note={demo.note} />;
    case "grid-playground":
      return <GridPlayground title={demo.title} note={demo.note} />;
    case "prompt-lab":
      return <PromptLab title={demo.title} note={demo.note} config={demo.config} />;
    case "box-model":
      return <BoxModel title={demo.title} note={demo.note} />;
    case "prompt-builder":
      return <PromptBuilder title={demo.title} note={demo.note} />;
    case "funnel-sim":
      return <FunnelSim title={demo.title} note={demo.note} />;
    case "decision-quiz":
      return <DecisionQuiz title={demo.title} note={demo.note} config={demo.config} />;
    case "scenario-judge":
      return <ScenarioJudge title={demo.title} note={demo.note} config={demo.config} />;
    case "priority-matrix":
      return <PriorityMatrix title={demo.title} note={demo.note} config={demo.config} />;
    case "color-contrast":
      return <ColorContrast title={demo.title} note={demo.note} />;
    case "agent-loop":
      return <AgentLoop title={demo.title} note={demo.note} config={demo.config} />;
    case "workflow-flow":
      return <WorkflowFlow title={demo.title} note={demo.note} config={demo.config} />;
    default:
      return null;
  }
}

export function LessonDemos({ demos }: { demos: LessonDemo[] }) {
  const usable = demos.filter((d) => SUPPORTED.has(d.type));
  if (usable.length === 0) return null;
  return (
    <div className="mt-4">
      <div className="text-sm font-semibold mb-2 flex items-center gap-2">
        <Sparkles size={16} /> <span>互動體驗</span>
      </div>
      <div className="space-y-3">
        {usable.map((d, i) => (
          <DemoRenderer key={i} demo={d} />
        ))}
      </div>
    </div>
  );
}
