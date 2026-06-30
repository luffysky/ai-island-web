import Link from "next/link";

/** Creator Island skeleton 模組共用「即將推出」頁（非互動、不顯示假資料）。 */
export function ComingSoon({ emoji, title, desc, previews }: { emoji: string; title: string; desc: string; previews: string[] }) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-5">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">{emoji} {title}
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 align-middle">即將推出</span>
        </h1>
        <Link href="/creator-island" className="text-sm text-accent hover:underline">← 回島</Link>
      </header>
      <p className="text-sm text-fg-muted">{desc}</p>
      <div className="grid sm:grid-cols-2 gap-3" aria-disabled>
        {previews.map((p, i) => (
          <div key={i} className="bg-bg-card border border-dashed border-border rounded-xl p-4 text-sm text-fg-muted opacity-70 select-none">
            {p}
          </div>
        ))}
      </div>
    </div>
  );
}
