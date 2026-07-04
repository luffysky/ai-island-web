/** FIE 共用型別（zod schema + z.infer），供 reason agent 驗證與 API 回傳共用。白皮書 Part II II-3。 */
import { z } from "zod";

export type ReasoningMode = "familiar" | "adjacent" | "exploratory";
export const MODES: ReasoningMode[] = ["familiar", "adjacent", "exploratory"];

/** 單顆碎片的 Representation（顯式標記 role/salience/surprise，杜絕 co-occurrence 冒充理解）。 */
export type FragmentRepr = {
  fragmentId: string;
  role: string;          // theme|emotion|character|setting|motif|detail|conflict
  salience: number;      // 0..1 主題權重
  surprise: number;      // 0..1 與其他碎片的語意反差
  summary: string;
};

/** reason agent 的輸出（M2 產出、M3 再由系統算 weight/rank）。 */
export const ReasonOutputSchema = z.object({
  observation: z.string(),                       // 只建立事實、不做故事假設
  candidates: z.array(z.object({
    title: z.string(),
    body: z.string(),                            // 敘事方向 / 半成品故事
    rationale: z.string(),                       // 為何這樣推理
    confidence: z.number().min(0).max(1),        // 模型自評
    evidenceFragmentIds: z.array(z.string()).default([]),
    missing: z.array(z.string()).default([]),    // Missing Fragment
  })).min(1),
});
export type ReasonOutput = z.infer<typeof ReasonOutputSchema>;

/** 系統排序後的 Candidate（含 weight/rank）。 */
export type ScoredCandidate = {
  rank: number;
  title: string;
  body: string;
  rationale: string;
  confidence: number;
  weight: number;
  evidenceIds: string[];
  missing: string[];
};

export type ReasoningResult = {
  runId: string;
  agentRunId: number | null;       // 對應 ci_agent_runs（供「用到的記憶」查詢）
  mode: ReasoningMode;
  observation: string;
  candidates: ScoredCandidate[];   // 已按 weight 降序、rank 1..N
};
