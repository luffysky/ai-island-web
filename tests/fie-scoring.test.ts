import { describe, it, expect } from "vitest";
import { scoreCandidates, resolveMode } from "@/lib/creator-engine/fie/reason";

const C = (title: string, confidence: number, ev: string[] = [], missing: string[] = []) =>
  ({ title, body: "", rationale: "", confidence, evidenceFragmentIds: ev, missing });

describe("FIE scoreCandidates（M3 純函數）", () => {
  it("依 weight 降序、rank 1..N 連續", () => {
    const out = scoreCandidates([C("a", 0.9), C("b", 0.5), C("c", 0.7)], "familiar");
    expect(out.map((c) => c.rank)).toEqual([1, 2, 3]);
    expect(out[0].weight).toBeGreaterThanOrEqual(out[1].weight);
    expect(out[1].weight).toBeGreaterThanOrEqual(out[2].weight);
    expect(out[0].title).toBe("a"); // 最高 confidence → rank1（familiar 偏 confidence）
  });

  it("決定性：同輸入同輸出", () => {
    const input = [C("x", 0.8, ["f1"]), C("y", 0.6)];
    expect(scoreCandidates(input, "adjacent")).toEqual(scoreCandidates(input, "adjacent"));
  });

  it("evidence 越多、weight 越高（同 confidence）", () => {
    const [more] = scoreCandidates([C("m", 0.7, ["f1", "f2", "f3"])], "familiar");
    const [less] = scoreCandidates([C("l", 0.7, [])], "familiar");
    expect(more.weight).toBeGreaterThan(less.weight);
  });

  it("exploratory 給高 missing(新奇)加成、familiar 不加", () => {
    const cand = C("n", 0.5, [], ["缺主角", "缺衝突", "缺結局"]);
    const explo = scoreCandidates([cand], "exploratory")[0].weight;
    const fam = scoreCandidates([cand], "familiar")[0].weight;
    expect(explo).toBeGreaterThan(0); expect(fam).toBeGreaterThan(0);
    // 相同 candidate：exploratory 的 novelty 分量存在（不必然大於 familiar 的 base，但 novelty 有進 weight）
    const exploNoMissing = scoreCandidates([C("n", 0.5)], "exploratory")[0].weight;
    expect(explo).toBeGreaterThan(exploNoMissing); // missing 有加成
  });

  it("DNA 特徵命中 → alignment 加成", () => {
    const cand = C("關於奶茶與捷運的青春", 0.6);
    const withDna = scoreCandidates([cand], "familiar", { imagery: ["奶茶", "捷運"], strengths: [] })[0].weight;
    const noDna = scoreCandidates([cand], "familiar")[0].weight;
    expect(withDna).toBeGreaterThan(noDna);
  });

  it("空/未定義欄位不炸", () => {
    const out = scoreCandidates([{ title: "t", body: "", rationale: "", confidence: 0.5 } as any], "adjacent");
    expect(out[0].rank).toBe(1);
  });
});

describe("FIE resolveMode（決定性）", () => {
  it("明示優先", () => {
    expect(resolveMode("exploratory")).toBe("exploratory");
    expect(resolveMode("familiar", "想突破")).toBe("familiar");
  });
  it("未指定：intent 提到突破 → exploratory；否則 adjacent", () => {
    expect(resolveMode(undefined, "想要突破一下")).toBe("exploratory");
    expect(resolveMode(undefined, "寫一首歌")).toBe("adjacent");
    expect(resolveMode(undefined)).toBe("adjacent");
  });
});
