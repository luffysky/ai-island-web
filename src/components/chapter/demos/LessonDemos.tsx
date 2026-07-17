"use client";
import type { LessonDemo } from "@/lib/types";
import { Sparkles } from "lucide-react";
import { LayoutGallery } from "./LayoutGallery";

/**
 * 依 demo.type 派發到對應的互動教具元件。
 * 未知型別直接略過（不炸畫面），方便之後逐一補齊新教具。
 */
function DemoRenderer({ demo }: { demo: LessonDemo }) {
  switch (demo.type) {
    case "css-layout":
    case "rwd-ruler":
      // 兩者現階段都由 LayoutGallery 提供（含版型切換 + 拖寬度看 RWD）
      return <LayoutGallery title={demo.title} note={demo.note} />;
    default:
      return null;
  }
}

export function LessonDemos({ demos }: { demos: LessonDemo[] }) {
  const usable = demos.filter((d) => d.type === "css-layout" || d.type === "rwd-ruler");
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
