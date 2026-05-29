/**
 * Lottie 8 個用途 slot 定義 — 給 /admin/lottie-settings + 各端讀 app_settings 用
 *
 * 抽出獨立檔案、避免 Next.js page.tsx 不能 export non-page fields 的 lint 錯
 */

export type LottieSlot = {
  key: string;
  label: string;
  desc: string;
  scope: "admin" | "frontend" | "shared";
  recommendedKeywords: string;
};

export const LOTTIE_SLOTS: LottieSlot[] = [
  {
    key: "admin_lottie_url",
    label: "👑 後台整頁背景",
    desc: "整個 /admin 後台底層動畫、建議動漫人物 / lo-fi anime / Ghibli 風 / 動漫貓",
    scope: "admin",
    recommendedKeywords: "anime girl, lo-fi anime, ghibli, sleeping cat, kawaii cat, anime study, kaguya",
  },
  {
    key: "home_hero_lottie_url",
    label: "🏝️ 首頁 Hero 區",
    desc: "首頁主視覺背景動畫",
    scope: "frontend",
    recommendedKeywords: "floating particles, aurora wave, island floating, constellation, magic dust",
  },
  {
    key: "chapter_hero_lottie_url",
    label: "📚 章節頁裝飾",
    desc: "章節詳細頁頂部裝飾動畫",
    scope: "frontend",
    recommendedKeywords: "geometric mesh, code rain, matrix, abstract waves, circuit board",
  },
  {
    key: "login_lottie_url",
    label: "🔐 登入頁裝飾",
    desc: "登入 / 註冊頁裝飾動畫",
    scope: "frontend",
    recommendedKeywords: "floating island, sakura petals, anime sunrise, magic gate, fox spirit",
  },
  {
    key: "empty_state_lottie_url",
    label: "📭 空狀態 (沒文章 / 沒紀錄)",
    desc: "全站列表沒資料時顯示、建議療癒可愛風",
    scope: "shared",
    recommendedKeywords: "empty box cat, sleeping shiba, lo-fi anime girl reading, kawaii sleeping",
  },
  {
    key: "celebration_lottie_url",
    label: "🎉 完課 / 解鎖成就慶祝",
    desc: "用戶達成目標時的全頁慶祝動畫",
    scope: "shared",
    recommendedKeywords: "confetti, fireworks, anime celebration, jpop pop, star burst",
  },
  {
    key: "ai_chat_lottie_url",
    label: "💬 AI 對話 idle 動畫",
    desc: "AI 導師等待輸入時的小動畫",
    scope: "shared",
    recommendedKeywords: "thinking cat, anime thinking, lofi waiting, breathing avatar",
  },
  {
    key: "loading_lottie_url",
    label: "⏳ Loading skeleton 替代",
    desc: "頁面載入時的 placeholder 動畫",
    scope: "shared",
    recommendedKeywords: "loading dots, running cat, anime running, hourglass",
  },
  {
    key: "pet_lottie_hamster_url",
    label: "🐹 倉鼠寵物（招財）",
    desc: "右下角倉鼠寵物的 Lottie 動畫、沒填會 fallback 回 emoji 🐹",
    scope: "frontend",
    recommendedKeywords: "hamster running, hamster wheel, kawaii hamster, chubby hamster",
  },
  {
    key: "pet_lottie_cat_url",
    label: "🐱 貓寵物（Mochi）",
    desc: "右下角貓寵物的 Lottie 動畫、沒填會 fallback 回 emoji 🐱",
    scope: "frontend",
    recommendedKeywords: "anime cat, kawaii cat, lazy cat, cat tail flick",
  },
  {
    key: "pet_lottie_dog_url",
    label: "🐶 狗寵物（Lucky）",
    desc: "右下角狗寵物的 Lottie 動畫、沒填會 fallback 回 emoji 🐶",
    scope: "frontend",
    recommendedKeywords: "shiba inu, kawaii dog, doge wag, puppy",
  },
  {
    key: "pet_lottie_rabbit_url",
    label: "🐰 兔子寵物（麻糬）",
    desc: "右下角兔子寵物的 Lottie 動畫、沒填會 fallback 回 emoji 🐰",
    scope: "frontend",
    recommendedKeywords: "bunny hopping, kawaii rabbit, rabbit ears, mochi rabbit",
  },
];
