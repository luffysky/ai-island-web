import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { LottieSettingsClient } from "./LottieSettingsClient";

export const dynamic = "force-dynamic";

type LottieSlot = {
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
];

export default async function LottieSettingsPage() {
  const admin = createSupabaseAdmin();
  const { data } = await admin
    .from("app_settings")
    .select("key, value")
    .in("key", LOTTIE_SLOTS.map((s) => s.key).concat(["admin_lottie_opacity", "home_hero_lottie_opacity"]));

  const settings: Record<string, any> = {};
  for (const r of (data as any[]) ?? []) {
    settings[r.key] = r.value;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">🎨 Lottie 動畫設定</h1>
        <p className="text-xs text-fg-muted mt-1 leading-relaxed">
          幫每個用途 paste 一個 LottieFiles 的 <code className="text-purple-300 bg-bg-elevated px-1 rounded">.lottie</code> URL、
          右側即時 preview、滿意按「儲存」就上線、不用動 code。
          推薦關鍵字在每個欄位下方、點關鍵字直接去 LottieFiles 搜尋。
        </p>
      </div>
      <LottieSettingsClient slots={LOTTIE_SLOTS} initial={settings} />
    </div>
  );
}
