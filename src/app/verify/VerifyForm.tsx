"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Search } from "lucide-react";

export function VerifyForm() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const go = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim();
    if (c) router.push(`/certificates/${encodeURIComponent(c)}`);
  };

  return (
    <main className="max-w-md mx-auto px-4 py-16 sm:py-24 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-500 mb-4">
        <BadgeCheck className="w-7 h-7" />
      </div>
      <h1 className="text-2xl font-bold text-black/85 dark:text-white/90">驗證完課證書</h1>
      <p className="text-sm text-black/55 dark:text-white/55 mt-1 mb-6">輸入證書上的驗證碼，確認它是 AI 島核發的真實證書。</p>
      <form onSubmit={go} className="flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="輸入驗證碼"
          className="flex-1 px-4 py-2.5 rounded-full border border-black/15 dark:border-white/15 bg-white dark:bg-white/5 text-black/80 dark:text-white/85 font-mono text-sm" />
        <button type="submit" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition">
          <Search className="w-4 h-4" /> 驗證
        </button>
      </form>
    </main>
  );
}
