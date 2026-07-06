/** 所有遊戲的關卡總表：給 /api/quest/complete 驗證 levelId + 取 xp/z（不信任 client）。 */
import { QUEST_LEVELS } from "./levels";
import { PAINT_LEVELS } from "./paint-levels";
import { TURTLE_LEVELS } from "./turtle-levels";
import { NUMBER_LEVELS } from "./number-levels";
import { DEBUG_LEVELS } from "./debug-levels";
import { SORT_LEVELS } from "./sort-levels";
import { CSS_LEVELS } from "./css-levels";
import { getDbAnyLevel } from "./db-levels";

export async function getAnyLevel(id: string): Promise<{ id: string; xp: number; z: number } | null> {
  const all = [...QUEST_LEVELS, ...PAINT_LEVELS, ...TURTLE_LEVELS, ...NUMBER_LEVELS, ...DEBUG_LEVELS, ...SORT_LEVELS, ...CSS_LEVELS];
  const l = all.find((x) => x.id === id);
  if (l) return { id: l.id, xp: l.xp, z: l.z };
  // 內建沒有 → 查 AI 生成關卡（DB）
  return getDbAnyLevel(id);
}
