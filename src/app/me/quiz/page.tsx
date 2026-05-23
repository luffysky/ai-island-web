import { DailyQuizClient } from "./DailyQuizClient";

export const dynamic = "force-dynamic";

export default function MyDailyQuizPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">🧠 每日測驗</h1>
        <p className="text-sm text-fg-muted mt-1">
          從學過的章節 + leetcode 抽 8 題、答對 60% 過關、領 XP + Z-coin。每天限玩一次。
        </p>
      </header>
      <DailyQuizClient />
    </div>
  );
}
