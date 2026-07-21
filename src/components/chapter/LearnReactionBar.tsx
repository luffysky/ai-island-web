"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatedEmoji } from "@/components/ui/AnimatedEmoji";
import { LEARN_REACTIONS } from "@/lib/reactions";

// 瀏覽器指紋（未登入也能反應、防同人重複；跟 blog reactions 同套路）
function getFingerprint(): string {
  const key = "learn_fp";
  let fp = localStorage.getItem(key);
  if (!fp) { fp = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(key, fp); }
  return fp;
}

/**
 * 學習反應條：每節課底部的情緒反饋（懂了 / 卡住 / 太神 / 哈哈 / 加油 / 讚 / 愛 / 慶祝）。
 * 動態 Noto emoji、按下有 micro 慶祝上浮動畫；未登入也能按。
 */
export function LearnReactionBar({ lessonId, chapterId }: { lessonId: string; chapterId?: number }) {
  const t = useTranslations("reactions");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [burst, setBurst] = useState<string | null>(null);
  const api = `/api/lessons/${lessonId}/reactions`;

  useEffect(() => {
    fetch(api).then((r) => r.json()).then((j) => setCounts(j.reactions ?? {})).catch(() => {});
    try { const saved = localStorage.getItem(`learn_react_${lessonId}`); if (saved) setMine(new Set(JSON.parse(saved))); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  const persistMine = (next: Set<string>) => { try { localStorage.setItem(`learn_react_${lessonId}`, JSON.stringify([...next])); } catch {} };

  const toggle = async (key: string) => {
    const had = mine.has(key);
    // 樂觀更新
    setMine((prev) => { const n = new Set(prev); had ? n.delete(key) : n.add(key); persistMine(n); return n; });
    setCounts((c) => ({ ...c, [key]: Math.max(0, (c[key] ?? 0) + (had ? -1 : 1)) }));
    if (!had) { setBurst(key); setTimeout(() => setBurst(null), 700); }

    const res = await fetch(api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reactionKey: key, fingerprint: getFingerprint(), chapterId }),
    }).catch(() => null);
    if (!res || !res.ok) {
      // 回滾
      setMine((prev) => { const n = new Set(prev); had ? n.add(key) : n.delete(key); persistMine(n); return n; });
      setCounts((c) => ({ ...c, [key]: Math.max(0, (c[key] ?? 0) + (had ? 1 : -1)) }));
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <div className="text-xs text-fg-muted mb-2">{t("lessonPrompt")}</div>
      <div className="flex flex-wrap gap-1.5">
        {LEARN_REACTIONS.map((r) => {
          const active = mine.has(r.key);
          const count = counts[r.key] ?? 0;
          return (
            <button
              key={r.key}
              onClick={() => toggle(r.key)}
              title={t(r.labelKey)}
              className={`relative px-2.5 py-1 rounded-full border text-xs transition flex items-center gap-1 ${active ? "border-accent bg-accent/15" : "border-border bg-bg-card hover:border-accent"}`}
            >
              <AnimatedEmoji emoji={r.emoji} code={r.code} size={18} play={active || burst === r.key} />
              <span>{t(r.labelKey)}</span>
              {count > 0 && <span className="font-bold">{count}</span>}
              {burst === r.key && (
                <span className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 text-sm animate-[learnBurst_.7s_ease-out]">{r.emoji}</span>
              )}
            </button>
          );
        })}
      </div>
      <style>{`@keyframes learnBurst{0%{opacity:0;transform:translate(-50%,0) scale(.6)}30%{opacity:1}100%{opacity:0;transform:translate(-50%,-22px) scale(1.2)}}`}</style>
    </div>
  );
}
