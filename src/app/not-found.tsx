import Link from "next/link";
import { Compass, Home, BookOpen, Users } from "lucide-react";

export const metadata = {
  title: "找不到這頁 | AI 島",
  description: "你要的頁面可能搬家了或不存在。",
};

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full bg-bg-card border border-border rounded-2xl p-6 sm:p-8 text-center">
        <div className="text-6xl mb-2">🗺️</div>
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-1">
          這座島找不到喔
        </h1>
        <p className="text-sm text-fg-muted leading-relaxed mb-6">
          你要的頁面可能搬家了、被刪了、或從來沒存在過。<br />
          試試以下這幾個位置：
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
          <Link
            href="/"
            className="px-3 py-3 rounded-xl border border-border hover:border-accent transition inline-flex items-center justify-center gap-2 text-sm"
          >
            <Home size={14} /> 首頁
          </Link>
          <Link
            href="/chapters"
            className="px-3 py-3 rounded-xl border border-border hover:border-accent transition inline-flex items-center justify-center gap-2 text-sm"
          >
            <BookOpen size={14} /> 章節列表
          </Link>
          <Link
            href="/leaderboard"
            className="px-3 py-3 rounded-xl border border-border hover:border-accent transition inline-flex items-center justify-center gap-2 text-sm"
          >
            <Users size={14} /> 排行榜
          </Link>
          <Link
            href="/career"
            className="px-3 py-3 rounded-xl border border-border hover:border-accent transition inline-flex items-center justify-center gap-2 text-sm"
          >
            <Compass size={14} /> 職業路線
          </Link>
        </div>
      </div>
    </div>
  );
}
