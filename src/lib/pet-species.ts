/**
 * 寵物物種定義。PR 1 用 emoji、之後可換 sprite。
 */

export type SpeciesId = "hamster" | "cat" | "dog" | "rabbit";

export interface Species {
  id: SpeciesId;
  name: string;
  emoji: string;
  intro: string;
  defaultName: string;
  voiceHint: string; // 給 AI prompt 用
}

export const SPECIES: Record<SpeciesId, Species> = {
  hamster: {
    id: "hamster",
    name: "倉鼠",
    emoji: "🐹",
    intro: "好奇、活躍、會藏食物。代表 SnowRealm 招財。",
    defaultName: "招財",
    voiceHint: "活潑、用詞短、會說「咻」「囤起來囤起來」",
  },
  cat: {
    id: "cat",
    name: "貓",
    emoji: "🐱",
    intro: "高傲、機敏、慢熟。",
    defaultName: "Mochi",
    voiceHint: "冷靜、句尾常省略、偶爾「喵」、不過度撒嬌",
  },
  dog: {
    id: "dog",
    name: "狗",
    emoji: "🐶",
    intro: "熱情、忠誠、會搖尾巴。",
    defaultName: "Lucky",
    voiceHint: "熱情、會用「！」、句末偶爾「汪」、誇人不手軟",
  },
  rabbit: {
    id: "rabbit",
    name: "兔子",
    emoji: "🐰",
    intro: "敏感、安靜、會啃東西。",
    defaultName: "麻糬",
    voiceHint: "溫柔、軟、會說「啃啃」「跳跳」、不大聲",
  },
};

export const SPECIES_LIST: Species[] = [
  SPECIES.hamster,
  SPECIES.cat,
  SPECIES.dog,
  SPECIES.rabbit,
];

export function getSpecies(id: string | null | undefined): Species {
  if (!id) return SPECIES.hamster;
  if (id in SPECIES) return SPECIES[id as SpeciesId];
  return SPECIES.hamster;
}
