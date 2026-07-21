import { describe, it, expect } from "vitest";
import {
  TASK_TEMPLATES, CATEGORY_META, popularTemplates, templatesByCategory,
} from "./task-templates";

describe("task-templates", () => {
  it("id 全域唯一", () => {
    expect(new Set(TASK_TEMPLATES.map((t) => t.id)).size).toBe(TASK_TEMPLATES.length);
  });
  it("每個範本 category 合法、goal/title/hint 非空", () => {
    for (const t of TASK_TEMPLATES) {
      expect(CATEGORY_META[t.category]).toBeTruthy();
      expect(t.title.trim()).toBeTruthy();
      expect(t.hint.trim()).toBeTruthy();
      expect(t.goal.trim().length).toBeGreaterThan(5);
    }
  });
  it("每個分類至少有一個範本", () => {
    for (const c of Object.keys(CATEGORY_META) as (keyof typeof CATEGORY_META)[]) {
      expect(templatesByCategory(c).length).toBeGreaterThan(0);
    }
  });
  it("popular 子集非空且都屬於全集", () => {
    const pop = popularTemplates();
    expect(pop.length).toBeGreaterThan(0);
    expect(pop.every((t) => t.popular)).toBe(true);
  });
});
