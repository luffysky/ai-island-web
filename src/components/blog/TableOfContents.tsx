"use client";

import { useEffect, useState } from "react";
import { List } from "lucide-react";

interface Heading {
  id: string;
  text: string;
  level: number;
}

/**
 * 自動掃描指定容器內的 h2 / h3，產出側欄目錄（含目前位置高亮）。
 * 不需要事先對 HTML 加 id — 掃描時若沒 id 就 slugify 並寫回 DOM。
 *
 * usage: <TableOfContents containerSelector=".prose-custom" />
 */
export function TableOfContents({
  containerSelector,
}: {
  containerSelector: string;
}) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const els = Array.from(
      container.querySelectorAll("h2, h3"),
    ) as HTMLHeadingElement[];

    const used = new Set<string>();
    const list: Heading[] = els.map((el) => {
      const text = el.textContent?.trim() ?? "";
      let id = el.id;
      if (!id) {
        const base =
          text
            .toLowerCase()
            .replace(/[^a-z0-9一-鿿]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 60) || "h";
        id = base;
        let i = 1;
        while (used.has(id)) {
          id = `${base}-${i++}`;
        }
        el.id = id;
      }
      used.add(id);
      return { id, text, level: el.tagName === "H3" ? 3 : 2 };
    });

    setHeadings(list);

    if (list.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const inView = entries.find((e) => e.isIntersecting);
        if (inView) setActiveId(inView.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [containerSelector]);

  if (headings.length < 2) return null;

  return (
    <aside className="hidden xl:block fixed top-24 right-6 w-56 z-30">
      <div className="bg-bg-card/80 backdrop-blur border border-border rounded-xl p-3 text-sm max-h-[70vh] overflow-y-auto">
        <div className="flex items-center gap-1.5 mb-2 text-xs text-fg-muted sticky top-0 bg-bg-card/95 -mt-1 pt-1 pb-1">
          <List size={12} />
          目錄
        </div>
        <ul className="space-y-0.5">
          {headings.map((h) => (
            <li
              key={h.id}
              style={{ paddingLeft: h.level === 3 ? "0.75rem" : 0 }}
            >
              <a
                href={`#${h.id}`}
                className={`block py-1 text-xs leading-snug transition truncate ${
                  activeId === h.id
                    ? "text-accent font-medium"
                    : "text-fg-muted hover:text-fg"
                }`}
              >
                {h.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
