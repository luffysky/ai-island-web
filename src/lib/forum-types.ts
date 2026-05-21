// 討論區系統型別

export interface ForumBoard {
  id: string;
  category: string;
  name: string;
  slug: string;
  description: string | null;
  emoji: string;
  sort_order: number;
  post_role: "member" | "admin";
  is_active: boolean;
  created_at: string;
}

export interface ForumThread {
  id: string;
  board_id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  is_pinned: boolean;
  is_featured: boolean;
  is_locked: boolean;
  view_count: number;
  reply_count: number;
  last_reply_at: string;
  created_at: string;
  updated_at: string;
  // join 後可能帶上
  author?: { username: string; display_name: string | null; avatar_url: string | null; level: number };
  board?: { name: string; slug: string; emoji: string };
}

export interface ForumReply {
  id: string;
  thread_id: string;
  parent_id: string | null;
  user_id: string;
  content: string;
  is_answer: boolean;
  created_at: string;
  author?: { username: string; display_name: string | null; avatar_url: string | null; level: number };
  replies?: ForumReply[];
}

export interface ForumReaction {
  id: string;
  thread_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

// 版塊大分類順序
export const FORUM_CATEGORIES = ["學習區", "教學區", "交流區", "站務區"] as const;
