// 每日一句 / 每日 AI Tip：手寫靜態庫，依「一年中的第幾天」輪播——決定性、每天固定、零 AI 成本。
export function dayOfYear(dateMs: number): number {
  const d = new Date(dateMs);
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((dateMs - start) / 86400000);
}

const SENTENCES = [
  "把昨天不會的 Prompt 再試一次。",
  "今天只學一個新的 AI 名詞就好，慢慢累積。",
  "遇到不會的，先問 AI「用國中生能懂的方式解釋」。",
  "與其收藏教學，不如現在就打開一課跑一次。",
  "把一個重複的日常任務，試著交給 AI 幫你做。",
  "今天寫一段 Prompt，明天再回來把它改得更好。",
  "學 AI 不用一次學會，能每天碰一下就贏很多人。",
  "把你手上正在煩的事，丟給 AI 問三種解法。",
  "今天讀懂一個報錯訊息，就是一次真實的進步。",
  "用 AI 幫你把想法整理成三點，再開始動手。",
  "不確定就先做小版本，跑起來再慢慢加。",
  "把今天學到的一句話，用自己的話再說一次。",
];

const TIPS = [
  { q: "不知道怎麼問 AI？", body: "試著加入四件事：角色、目標、限制、格式——回答通常會好很多。" },
  { q: "AI 答得太籠統？", body: "給它一個具體例子，並說「照這個風格再寫」。" },
  { q: "怕 AI 亂編？", body: "要它「附上依據/來源，不確定就說不知道」。" },
  { q: "回答太長？", body: "加上「用 3 點、每點一句話」限制輸出。" },
  { q: "想要它一步步做？", body: "說「先列步驟等我確認，再開始執行」。" },
  { q: "換個角度？", body: "要它「用反方意見挑戰你剛剛的結論」。" },
  { q: "想學得更快？", body: "問「這個概念用一個生活比喻解釋」。" },
  { q: "要它幫你檢查？", body: "貼上你的內容，說「挑出 3 個可以改進的地方」。" },
];

export function dailySentence(dateMs: number): string {
  return SENTENCES[dayOfYear(dateMs) % SENTENCES.length];
}
export function dailyTip(dateMs: number): { q: string; body: string } {
  return TIPS[dayOfYear(dateMs) % TIPS.length];
}
