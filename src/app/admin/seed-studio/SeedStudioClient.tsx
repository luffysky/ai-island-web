"use client";

import { useState } from "react";
import { MessagesSquare, Newspaper, NotebookPen } from "lucide-react";
import { ForumSeedClient } from "@/app/admin/forum-seed/ForumSeedClient";
import { BlogSeedClient } from "@/app/admin/blog-seed/BlogSeedClient";
import { NotesSeedClient } from "./NotesSeedClient";

type Board = { id: string; name: string; slug: string; description: string | null; category: string; emoji: string };
type Persona = { id: string; username: string; display_name: string; bio: string | null };

const TABS = [
  { id: "forum", label: "討論區", icon: MessagesSquare },
  { id: "blog", label: "部落格", icon: Newspaper },
  { id: "notes", label: "筆記", icon: NotebookPen },
] as const;

export function SeedStudioClient({ boards, personas }: { boards: Board[]; personas: Persona[] }) {
  const [tab, setTab] = useState<"forum" | "blog" | "notes">("forum");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 text-sm border-b border-border">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 -mb-px border-b-2 transition ${active ? "border-accent text-accent font-bold" : "border-transparent text-fg-muted hover:text-fg"}`}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "forum" && <ForumSeedClient boards={boards as any} personas={personas as any} />}
      {tab === "blog" && <BlogSeedClient personas={personas as any} />}
      {tab === "notes" && <NotesSeedClient personas={personas as any} />}
    </div>
  );
}
