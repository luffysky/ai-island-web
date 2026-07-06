/** 所有遊戲的關卡總表：給 /api/quest/complete 驗證 levelId + 取 xp/z（不信任 client）。 */
import { QUEST_LEVELS } from "./levels";
import { PAINT_LEVELS } from "./paint-levels";
import { TURTLE_LEVELS } from "./turtle-levels";
import { NUMBER_LEVELS } from "./number-levels";
import { DEBUG_LEVELS } from "./debug-levels";
import { SORT_LEVELS } from "./sort-levels";
import { CSS_LEVELS } from "./css-levels";

export function getAnyLevel(id: string): { id: string; xp: number; z: number } | null {
  const all = [...QUEST_LEVELS, ...PAINT_LEVELS, ...TURTLE_LEVELS, ...NUMBER_LEVELS, ...DEBUG_LEVELS, ...SORT_LEVELS, ...CSS_LEVELS];
  const l = all.find((x) => x.id === id);
  return l ? { id: l.id, xp: l.xp, z: l.z } : null;
}
