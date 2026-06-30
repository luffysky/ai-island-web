"use client";

import { useEffect, useState } from "react";
import { ExternalLink, BookOpen, Youtube, Newspaper, GraduationCap, Wrench, Users, Mic, FileText, Globe, Gamepad2, Compass, Sparkles, MapPin } from "lucide-react";

type Resource = {
  id: string;
  title: string;
  short_desc: string;
  url: string;
  type: string;
  source: string | null;
  curated_by: string;
};

const TYPE_ICON: Record<string, any> = {
  book: BookOpen, youtube: Youtube, blog: Newspaper, course: GraduationCap,
  tool: Wrench, community: Users, podcast: Mic, newsletter: FileText,
  docs: Globe, playground: Gamepad2,
};

const TYPE_LABEL: Record<string, string> = {
  book: "書", youtube: "影片", blog: "文章", course: "課程",
  tool: "工具", community: "社群", podcast: "Podcast", newsletter: "電子報",
  docs: "文件", playground: "練習場",
};

export function ChapterResources({ chapterId }: { chapterId: number }) {
  const [list, setList] = useState<Resource[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/chapters/${chapterId}/resources`)
      .then((r) => r.json())
      .then((j) => setList(j.resources ?? []))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [chapterId]);

  if (!loaded || list.length === 0) return null;

  return (
    <section className="my-8 bg-bg-card border border-border rounded-xl p-5">
      <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
        <Compass size={20} /> 這章相關外部資源
        <span className="text-xs text-fg-muted font-normal">（雪鑰精選 / 課外延伸）</span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {list.map((r) => {
          const Icon = TYPE_ICON[r.type] ?? Globe;
          return (
            <a
              key={r.id}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 bg-bg-elevated border border-border rounded-lg p-3 hover:border-accent transition group"
            >
              <div className="shrink-0 w-10 h-10 rounded-lg bg-bg flex items-center justify-center">
                <Icon size={18} className="text-fg-muted group-hover:text-accent transition" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-[10px] chip chip-neutral">{TYPE_LABEL[r.type] ?? r.type}</span>
                  {r.curated_by === "xueyue" && <span className="text-[10px] chip chip-info inline-flex items-center gap-1"><Sparkles size={11} /> 雪鑰精選</span>}
                  {r.source && <span className="text-[10px] text-fg-muted inline-flex items-center gap-1"><MapPin size={11} /> {r.source}</span>}
                </div>
                <p className="font-medium text-sm leading-tight mb-1 group-hover:text-accent transition flex items-center gap-1">
                  {r.title}
                  <ExternalLink size={11} className="text-fg-muted shrink-0" />
                </p>
                <p className="text-xs text-fg-muted line-clamp-2">{r.short_desc}</p>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
