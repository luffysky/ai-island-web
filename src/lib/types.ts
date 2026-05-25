// 內容資料模型
export interface Playground {
  key: string;                    // 唯一識別、user code 存這個 key
  language: 'html' | 'css' | 'js' | 'javascript' | 'python' | 'jsx' | 'tsx';
  title?: string;                 // 「試試看」「挑戰看看」
  initialCode: string;            // 預設 code
  expectedOutput?: string;        // 預期結果（用來驗證）
  hint?: string;
  height?: number;                // px、預設 400
}

export interface FileResource {
  name: string;                   // 顯示名稱
  filename: string;               // 下載檔名
  type: 'starter' | 'complete' | 'reference' | 'data';
  content?: string;               // inline 內容（小檔）
  url?: string;                   // 外部 URL（大檔）
  size?: string;                  // '2KB' / '15MB'
}

export interface MiniQuiz {
  question: string;
  options: { label: string; value: string }[];
  answer: string;
  explanation?: string;
}

export interface Lesson {
  id: string;              // '17.1'
  number: string;
  title: string;
  oneLineSummary: string;  // simple-intro one-liner
  analogy: string;         // simple-intro analogy
  content: string;         // markdown / HTML 完整內容
  outline?: { level: number; text: string }[];  // 從 content 抽出的章節大綱
  // 資源卡片群（附錄 I/J 用）
  resourceGroups?: {
    title: string;
    description?: string;
    resources: {
      type: 'video' | 'playlist' | 'book' | 'site' | 'app' | 'podcast' | 'github' | 'course' | 'playground' | 'blog' | 'community';
      title: string;
      url: string;
      desc?: string;
      author?: string;
      lang?: 'zh' | 'en' | 'jp' | 'mixed';
      price?: 'free' | 'paid' | 'freemium';
      tags?: string[];
      level?: 'beginner' | 'intermediate' | 'advanced' | 'all';
    }[];
  }[];
  tip?: {
    type: 'practical' | 'warning' | 'pro' | 'security' | 'business' | 'performance' | 'milestone' | 'trend';
    text: string;
  };
  exercise?: {
    question: string;       // 練習題目（markdown OK）
    hint?: string;          // 提示
    answer: string;         // 解答（markdown OK）
  };
  // 學習園地：每 lesson 可有多個 playground
  playgrounds?: Playground[];
  // 即時測驗
  miniQuiz?: MiniQuiz;
  // 檔案範例
  files?: FileResource[];
  xp: number;
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: { value: string; label: string }[];
  answer: string;
  explanation: string;
}

export interface Quiz {
  id: string;
  questions: QuizQuestion[];
  xpReward: number;
  perfectBonus: number;
}

export interface Chapter {
  id: number;              // 1-60 + 61+ appendix
  slug?: string;           // 'sql', 'nosql'
  stage: 1 | 2 | 3 | 4 | 5 | 6 | 7 | string;  // 7 = appendix
  sortIndex?: number;      // 顯示順序、無填回退 id (用來插入新章節在既有章節中間，例如 8.5)
  title: string;
  subtitle: string;
  icon: string;
  description: string;
  status?: 'published' | 'coming-soon';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'reference';
  prerequisites?: number[];
  estimatedHours: number;
  outcomes?: string[];
  lessons: Lesson[];
  quiz?: Quiz;
  summary?: string[];
  faq?: { q: string; a: string }[];
  // Boss 戰
  boss?: {
    name: string;
    hp: number;
    emoji: string;
    description: string;
  };
}

// 使用者 / 遊戲化
export interface UserProfile {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  xp: number;
  level: number;
  zCoin: number;
  hearts: number;
  heartsRecoveredAt: string;
  streakDays: number;
  lastActiveDate?: string;
  careerPath?: 'frontend' | 'fullstack' | 'ai-engineer' | 'data' | 'freelance' | 'indie';
  role: 'member' | 'editor' | 'admin';
  createdAt: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'milestone' | 'speed' | 'social' | 'perfect' | 'hidden';
  xpReward: number;
  zCoinReward: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: string;
}

export interface LessonProgress {
  userId: string;
  chapterId: number;
  lessonId: string;
  completed: boolean;
  completedAt: string;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  chapterId: number;
  quizId: string;
  score: number;
  totalQuestions: number;
  correct: number;
  perfect: boolean;
  attemptedAt: string;
}

export interface DailyQuest {
  id: string;
  userId: string;
  questDate: string;
  questType: 'lesson' | 'quiz' | 'streak' | 'exploration';
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  xpReward: number;
  zCoinReward: number;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  xp: number;
  level: number;
  streakDays: number;
  rank: number;
}

// 6 大職業路線
export const CAREER_PATHS = {
  frontend: {
    id: 'frontend', name: '🌱 前端工匠', emoji: '🎨',
    title: '介面雕刻師',
    chapters: [1, 2, 3, 4, 5, 6, 7, 8],
    description: 'HTML / CSS / UI/UX / JS / TS / JSON / 邏輯 / React',
  },
  fullstack: {
    id: 'fullstack', name: '🚀 全端戰士', emoji: '🛡️',
    title: '全端守護者',
    chapters: [1, 4, 7, 8, 10, 16, 17, 20, 22],
    description: 'HTML / JS / React / Next / 後端 / SQL / API / 部署',
  },
  'ai-engineer': {
    id: 'ai-engineer', name: '🤖 AI 馴獸師', emoji: '🤖',
    title: 'AI 共生師',
    chapters: [4, 26, 46, 47, 48, 49, 50],
    description: 'JS / Python / AI 原理 / 應用 / Vibe / Agent / n8n',
  },
  data: {
    id: 'data', name: '📊 資料煉金術士', emoji: '🔮',
    title: '數據先知',
    chapters: [7, 26, 27, 28, 17, 18],
    description: '邏輯 / Python / 資料分析 / 爬蟲 / SQL / NoSQL',
  },
  freelance: {
    id: 'freelance', name: '💼 接案傭兵', emoji: '⚔️',
    title: '自由商人',
    chapters: [1, 2, 4, 36, 37, 38, 39, 42],
    description: 'HTML / CSS / JS / PHP / WordPress / 金流 / LINE Bot',
  },
  indie: {
    id: 'indie', name: '🏝️ 島民創業家', emoji: '👑',
    title: '島嶼之王',
    chapters: [10, 47, 48, 50, 59, 60],
    description: 'Next.js / AI 應用 / Vibe / n8n / 一人公司',
  },
} as const;

// XP 計算
export function xpToLevel(xp: number): number {
  return Math.min(60, Math.max(1, Math.floor(Math.sqrt(xp / 100)) + 1));
}

export function levelToXp(level: number): number {
  return Math.pow(level - 1, 2) * 100;
}

export function xpForNextLevel(currentXp: number): { current: number; needed: number; progress: number } {
  const lv = xpToLevel(currentXp);
  const currentLevelXp = levelToXp(lv);
  const nextLevelXp = levelToXp(lv + 1);
  return {
    current: currentXp - currentLevelXp,
    needed: nextLevelXp - currentLevelXp,
    progress: (currentXp - currentLevelXp) / (nextLevelXp - currentLevelXp),
  };
}
