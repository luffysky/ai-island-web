"use client";

import { useEffect, useState } from "react";

// 顯示目前線上部署的 commit + build 時間（讀 /api/version）。
// 部署後不用手打網址、admin header 一眼確認線上是不是最新版。
export function DeployVersionBadge() {
  const [v, setV] = useState<{ commitShort?: string; commit?: string; builtAt?: string | null } | null>(null);

  useEffect(() => {
    fetch("/api/version").then((r) => r.json()).then(setV).catch(() => {});
  }, []);

  if (!v) return null;
  const dev = !v.commit || v.commit === "dev";
  const built = v.builtAt
    ? new Date(v.builtAt).toLocaleString("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <a
      href="/api/version"
      target="_blank"
      rel="noreferrer"
      title={dev ? "本機 / 未注入 commit" : `線上部署版本 ${v.commit}${built ? `（build ${built}）` : ""}`}
      className="text-[10px] font-mono px-2 py-1 rounded-full bg-bg-elevated text-fg-muted hover:text-accent transition whitespace-nowrap"
    >
      🚀 {dev ? "dev" : v.commitShort}{built ? ` · ${built}` : ""}
    </a>
  );
}
