import Link from "next/link";
import { Lock, Crown, ArrowRight } from "lucide-react";

/**
 * Premium 章節未訂閱 user 看到的遮罩。
 * 顯示在章節頁、蓋住 lesson 區。
 */
export function PaywallOverlay({ chapterId, chapterTitle }: { chapterId: number; chapterTitle: string }) {
  return (
    <div className="rounded-2xl border-2 border-accent/40 bg-gradient-to-br from-accent/15 via-accent-2/10 to-accent-3/5 p-8 my-8 text-center">
      <div className="text-6xl mb-3">🔒</div>
      <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
        <Crown size={22} className="text-yellow-400" />
        Premium 內容
      </h2>
      <p className="text-fg-muted mb-6">
        《{chapterTitle}》是付費章節。升級訂閱解鎖全部 71 章、無限 AI 對話、教材常更新。
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto mb-6">
        <Plan title="單章購買" price="NT$ 99" desc="只買這一章" cta="/pricing#single" highlight={false} />
        <Plan title="月訂閱" price="NT$ 299" desc="71 章 + AI 無限" cta="/pricing#monthly" highlight={true} />
        <Plan title="年訂閱" price="NT$ 2,999" desc="省 NT$ 589" cta="/pricing#yearly" highlight={false} />
      </div>
      <Link
        href={"/pricing" as any}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent text-black font-bold hover:scale-105 transition"
      >
        <Crown size={16} /> 看完整方案 <ArrowRight size={14} />
      </Link>
      <p className="text-xs text-fg-muted mt-4">
        💡 已訂閱？<Link href="/me" className="text-accent hover:underline">回個人後台</Link> 查看；新教師？<Link href="/teacher" className="text-accent hover:underline">teacher 後台</Link>
      </p>
    </div>
  );
}

function Plan({ title, price, desc, cta, highlight }: { title: string; price: string; desc: string; cta: string; highlight: boolean }) {
  return (
    <div className={`p-4 rounded-xl border ${highlight ? "border-accent bg-accent/10" : "border-border bg-bg-card"}`}>
      <div className="font-bold">{title}</div>
      <div className="text-2xl font-extrabold text-accent my-1">{price}</div>
      <div className="text-[10px] text-fg-muted">{desc}</div>
    </div>
  );
}
