"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Check, X, Loader2 } from "lucide-react";
import Link from "next/link";

function UnsubscribeContent() {
  const params = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }
    fetch(`/api/blog/unsubscribe?token=${token}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setEmail(j.email ?? "");
          setStatus("done");
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <div className="max-w-md mx-auto px-6 py-20 text-center">
      {status === "loading" && (
        <>
          <Loader2 size={32} className="mx-auto mb-3 animate-spin text-[var(--color-fg-muted)]" />
          <p className="text-[var(--color-fg-muted)]">處理中...</p>
        </>
      )}
      {status === "done" && (
        <>
          <div className="w-14 h-14 rounded-full bg-[var(--color-accent)]/15 flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-[var(--color-accent)]" />
          </div>
          <h1 className="text-xl font-bold mb-2">已取消訂閱</h1>
          <p className="text-sm text-[var(--color-fg-muted)] mb-6">
            {email && `${email} `}不會再收到這個部落格的通知。
          </p>
          <Link href="/" className="text-sm text-[var(--color-accent)]">回 AI 島首頁</Link>
        </>
      )}
      {status === "error" && (
        <>
          <div className="w-14 h-14 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
            <X size={28} className="text-red-400" />
          </div>
          <h1 className="text-xl font-bold mb-2">連結無效</h1>
          <p className="text-sm text-[var(--color-fg-muted)] mb-6">
            這個退訂連結可能已失效、或你已經取消過訂閱了。
          </p>
          <Link href="/" className="text-sm text-[var(--color-accent)]">回 AI 島首頁</Link>
        </>
      )}
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-[var(--color-fg-muted)]">載入中...</div>}>
      <UnsubscribeContent />
    </Suspense>
  );
}
