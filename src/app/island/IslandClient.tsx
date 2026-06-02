"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { chapterDisplayNumberById } from "@/lib/chapter-display";
import { X } from "lucide-react";
import { subscribeOpen, type IslandNodeId } from "@/components/island/island-bus";
import { TouchControls } from "@/components/island/TouchControls";
import { InventoryBag } from "@/components/island/InventoryBag";
import { QuestPanel } from "@/components/island/QuestPanel";
import { AmbientSound } from "@/components/island/AmbientSound";
import { PetTalk } from "@/components/island/PetTalk";
import { WeatherChip } from "@/components/island/WeatherChip";
import { MerchantPanel } from "@/components/island/MerchantPanel";
import { SeerPanel } from "@/components/island/SeerPanel";
import { BuffBar } from "@/components/island/BuffBar";
import { Minimap } from "@/components/island/Minimap";
import { BagPanel } from "@/components/island/BagPanel";
import { AchievementToast } from "@/components/island/AchievementToast";
import { GameHud } from "@/components/island/GameHud";
import { SettingsPanel } from "@/components/island/SettingsPanel";
import { RandomEvents } from "@/components/island/RandomEvents";
import { FishingMinigame } from "@/components/island/FishingMinigame";
import { HousePanel } from "@/components/island/HousePanel";
import { WeatherOverlay } from "@/components/island/WeatherOverlay";
import { WelcomeOverlay } from "@/components/island/WelcomeOverlay";
import { VillagerTalk } from "@/components/island/VillagerTalk";
import { formatTWRelative } from "@/lib/format-date";

const IslandV0 = dynamic(() => import("@/components/island/IslandV0"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="text-fg-muted">🏝️ 載入島嶼中…</div>
    </div>
  ),
});

type ChapterRow = { id: number; title: string; emoji: string; pct: number };
type TopUser = { id: string; username: string; display_name: string | null; avatar_url: string | null; xp: number; level: number };
type Thread = { id: string; title: string; created_at: string };
type Blog = { title: string; slug: string; published_at: string; username: string };
type Course = { slug: string; title: string; emoji: string | null; difficulty: string };

const NODE_TITLE: Record<IslandNodeId, string> = {
  chapters: "📚 章節大殿堂",
  courses: "🎮 副本入口",
  leaderboard: "🏆 排行榜",
  forum: "🗣️ 討論區公告板",
  blogs: "✍️ 部落格牆",
};

type ProfileLite = { username?: string | null; display_name?: string | null; avatar_url?: string | null; level?: number | null; xp?: number | null; z_coin?: number | null };

export default function IslandClient({
  completedChapterIds,
  level,
  petName,
  profile,
  chapters,
  topUsers,
  threads,
  blogs,
  courses,
}: {
  completedChapterIds: number[];
  level: number;
  petName: string | null;
  profile?: ProfileLite | null;
  chapters: ChapterRow[];
  topUsers: TopUser[];
  threads: Thread[];
  blogs: Blog[];
  courses: Course[];
}) {
  const [openId, setOpenId] = useState<IslandNodeId | null>(null);

  useEffect(() => {
    return subscribeOpen((id) => setOpenId(id));
  }, []);

  useEffect(() => {
    if (!openId) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenId(null); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [openId]);

  return (
    <div className="fixed inset-0 top-14 bg-black">
      <IslandV0 completedChapterIds={completedChapterIds} level={level} petName={petName} />
      <TouchControls />
      <InventoryBag />
      <WeatherChip />
      <AmbientSound />
      <QuestPanel />
      <MerchantPanel />
      <SeerPanel />
      <BuffBar />
      <Minimap />
      <BagPanel />
      <AchievementToast />
      <GameHud profile={profile ?? null} />
      <SettingsPanel />
      <RandomEvents />
      <FishingMinigame />
      <HousePanel />
      <WeatherOverlay />
      <WelcomeOverlay />
      <VillagerTalk />
      <PetTalk petName={petName} />

      <div className="absolute top-3 left-3 pointer-events-auto z-10 flex items-center gap-2">
        <Link href="/" className="text-xs text-white/70 hover:text-white px-3 py-1.5 rounded-full bg-black/40 backdrop-blur">
          ← 離開
        </Link>
        <span className="text-xs text-white/60 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur">
          🏘️ 已建 {completedChapterIds.length} 棟 · ⭐ Lv {level}
          {petName && <> · 🐾 {petName}</>}
        </span>
      </div>

      {openId && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
          onClick={() => setOpenId(null)}
        >
          <div
            className="bg-bg-card border border-border rounded-2xl shadow-2xl max-w-3xl w-[92%] max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="px-5 py-3 border-b border-border flex items-center justify-between">
              <h2 className="font-bold">{NODE_TITLE[openId]}</h2>
              <button onClick={() => setOpenId(null)} className="p-1 rounded hover:bg-bg-elevated" aria-label="關閉">
                <X size={18} />
              </button>
            </header>
            <div className="overflow-y-auto p-4">
              {openId === "chapters" && <ChaptersGrid chapters={chapters} />}
              {openId === "courses" && <CoursesList courses={courses} />}
              {openId === "leaderboard" && <Leaderboard users={topUsers} />}
              {openId === "forum" && <ThreadsList threads={threads} />}
              {openId === "blogs" && <BlogsList blogs={blogs} />}
            </div>
            <footer className="px-5 py-2 border-t border-border text-[10px] text-fg-muted text-center">
              點空白處或按 ESC 關閉、回島上繼續探索
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

function ChaptersGrid({ chapters }: { chapters: ChapterRow[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {chapters.map((c) => (
        <Link
          key={c.id}
          href={`/chapters/${c.id}` as any}
          className="rounded-lg border border-border bg-bg p-2 hover:border-accent hover:bg-bg-elevated transition text-xs"
        >
          <div className="flex items-center gap-1 mb-1">
            <span className="text-base">{c.emoji}</span>
            <span className="text-[10px] text-fg-muted">Ch {chapterDisplayNumberById(c.id)}</span>
          </div>
          <div className="font-medium truncate" title={c.title}>{c.title}</div>
          <div className="mt-1.5 h-1 bg-bg-elevated rounded-full overflow-hidden">
            <div className="h-full bg-accent" style={{ width: `${c.pct}%` }} />
          </div>
          <div className="text-[10px] text-fg-muted mt-0.5">{c.pct}%</div>
        </Link>
      ))}
    </div>
  );
}

function CoursesList({ courses }: { courses: Course[] }) {
  if (courses.length === 0) return <Empty text="目前還沒有副本" />;
  return (
    <ul className="space-y-1.5">
      {courses.map((c) => (
        <li key={c.slug}>
          <Link href={`/courses/${c.slug}` as any} className="flex items-center gap-2 p-2 rounded-lg hover:bg-bg-elevated text-sm">
            <span className="text-lg">{c.emoji || "🎮"}</span>
            <span className="flex-1 truncate">{c.title}</span>
            <span className="text-[10px] text-fg-muted">{c.difficulty}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Leaderboard({ users }: { users: TopUser[] }) {
  if (users.length === 0) return <Empty text="排行榜載入中" />;
  return (
    <ol className="space-y-1">
      {users.map((u, i) => (
        <li key={u.id}>
          <Link href={`/u/${u.username}` as any} className="flex items-center gap-2 p-2 rounded-lg hover:bg-bg-elevated text-sm">
            <span className={`w-6 text-center font-bold ${i < 3 ? "text-accent" : "text-fg-muted"}`}>{i + 1}</span>
            {u.avatar_url ? (
              <Image src={u.avatar_url} alt="" width={24} height={24} unoptimized className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-bg-elevated flex items-center justify-center text-[10px]">{(u.display_name || u.username || "?")[0]}</div>
            )}
            <span className="flex-1 truncate">{u.display_name || u.username}</span>
            <span className="text-xs text-accent font-bold">{u.xp.toLocaleString()}</span>
            <span className="text-[10px] text-fg-muted">Lv {u.level}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

function ThreadsList({ threads }: { threads: Thread[] }) {
  if (threads.length === 0) return <Empty text="還沒有人發文" />;
  return (
    <ul className="space-y-1">
      {threads.map((t) => (
        <li key={t.id}>
          <Link href={`/forum/thread/${t.id}` as any} className="flex items-center gap-2 p-2 rounded-lg hover:bg-bg-elevated text-sm">
            <span className="flex-1 truncate">{t.title}</span>
            <span className="text-[10px] text-fg-muted">{formatTWRelative(t.created_at)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function BlogsList({ blogs }: { blogs: Blog[] }) {
  if (blogs.length === 0) return <Empty text="還沒有公開文章" />;
  return (
    <ul className="space-y-1">
      {blogs.map((b) => (
        <li key={`${b.username}/${b.slug}`}>
          <Link href={`/blogs/${b.username}/${b.slug}` as any} className="flex items-center gap-2 p-2 rounded-lg hover:bg-bg-elevated text-sm">
            <span className="flex-1 truncate">{b.title}</span>
            <span className="text-[10px] text-fg-muted">@{b.username} · {formatTWRelative(b.published_at)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="text-center py-8 text-fg-muted text-sm">{text}</div>;
}
