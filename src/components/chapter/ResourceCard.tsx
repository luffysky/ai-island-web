"use client";

import {
  Youtube, BookOpen, Globe, Smartphone, Mic, Github, GraduationCap,
  ExternalLink, Code2, Newspaper, MessageCircle,
} from "lucide-react";

export type ResourceType =
  | "video"      // YouTube / Bilibili 頻道
  | "playlist"   // 系列播放清單
  | "book"       // 書（紙本 / 電子）
  | "site"       // 網站 / 教學平台
  | "app"        // App / 工具
  | "podcast"    // Podcast
  | "github"     // GitHub repo
  | "course"     // 線上課程
  | "playground" // 程式碼遊樂場
  | "blog"       // 部落格 / 文章
  | "community"; // 社群（Discord / Reddit）

export interface Resource {
  type: ResourceType;
  title: string;
  url: string;
  desc?: string;          // 一句話介紹
  author?: string;        // 作者 / 頻道主 / 出版社
  lang?: "zh" | "en" | "jp" | "mixed";
  price?: "free" | "paid" | "freemium";
  tags?: string[];        // 主題標籤
  level?: "beginner" | "intermediate" | "advanced" | "all";
}

const TYPE_META: Record<ResourceType, { icon: any; label: string; color: string }> = {
  video:      { icon: Youtube,        label: "影片",   color: "text-red-400 bg-red-500/10 border-red-500/30" },
  playlist:   { icon: Youtube,        label: "系列",   color: "text-red-300 bg-red-500/10 border-red-500/30" },
  book:       { icon: BookOpen,       label: "書籍",   color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  site:       { icon: Globe,          label: "網站",   color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" },
  app:        { icon: Smartphone,     label: "App",   color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
  podcast:    { icon: Mic,            label: "播客",   color: "text-pink-400 bg-pink-500/10 border-pink-500/30" },
  github:     { icon: Github,         label: "Repo",   color: "text-gray-300 bg-gray-500/10 border-gray-500/30" },
  course:     { icon: GraduationCap,  label: "課程",   color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
  playground: { icon: Code2,          label: "Playground", color: "text-green-400 bg-green-500/10 border-green-500/30" },
  blog:       { icon: Newspaper,      label: "部落格", color: "text-orange-400 bg-orange-500/10 border-orange-500/30" },
  community:  { icon: MessageCircle,  label: "社群",   color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30" },
};

const LANG_LABEL: Record<string, string> = {
  zh: "中",
  en: "EN",
  jp: "日",
  mixed: "雙",
};

const PRICE_BADGE: Record<string, { label: string; color: string }> = {
  free:     { label: "免費",   color: "bg-green-500/20 text-green-400" },
  paid:     { label: "付費",   color: "bg-orange-500/20 text-orange-400" },
  freemium: { label: "部分免費", color: "bg-blue-500/20 text-blue-400" },
};

const LEVEL_LABEL: Record<string, string> = {
  beginner:     "🌱 新手",
  intermediate: "🌿 中階",
  advanced:     "🌳 進階",
  all:          "✨ 全程度",
};

export function ResourceCard({ res }: { res: Resource }) {
  const meta = TYPE_META[res.type];
  const Icon = meta.icon;

  return (
    <a
      href={res.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block group p-4 rounded-xl border ${meta.color} hover:scale-[1.02] transition-all hover:shadow-lg`}
    >
      <div className="flex items-start gap-3 mb-2">
        <Icon size={20} className="shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30 font-mono">
              {meta.label}
            </span>
            {res.lang && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30 font-mono">
                {LANG_LABEL[res.lang]}
              </span>
            )}
            {res.price && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${PRICE_BADGE[res.price].color}`}>
                {PRICE_BADGE[res.price].label}
              </span>
            )}
            {res.level && res.level !== "all" && (
              <span className="text-[10px] text-fg-muted">
                {LEVEL_LABEL[res.level]}
              </span>
            )}
          </div>
          <h3 className="font-bold text-sm leading-tight group-hover:text-accent transition flex items-start gap-1">
            <span className="flex-1">{res.title}</span>
            <ExternalLink size={12} className="shrink-0 mt-1 opacity-50 group-hover:opacity-100" />
          </h3>
          {res.author && (
            <div className="text-xs text-fg-muted mt-0.5">
              by {res.author}
            </div>
          )}
        </div>
      </div>

      {res.desc && (
        <p className="text-xs text-fg/80 leading-relaxed mt-2 line-clamp-3">
          {res.desc}
        </p>
      )}

      {res.tags && res.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {res.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-bg-elevated text-fg-muted"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </a>
  );
}

/**
 * 群組顯示：一個分類 + 卡片列表
 */
export function ResourceGroup({
  title,
  description,
  resources,
}: {
  title: string;
  description?: string;
  resources: Resource[];
}) {
  return (
    <section className="mb-10">
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-1">{title}</h2>
        {description && (
          <p className="text-sm text-fg-muted">{description}</p>
        )}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {resources.map((r, i) => (
          <ResourceCard key={i} res={r} />
        ))}
      </div>
    </section>
  );
}
