"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";

export function JoinClient({ code }: { code: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "joining" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const join = async () => {
    setState("joining");
    try {
      const res = await fetch("/api/notes/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "加入失敗");
      setState("done");
      setTimeout(() => router.push("/me/notes"), 900);
    } catch (e: any) {
      setState("error");
      setMsg(e?.message || "加入失敗");
    }
  };

  if (state === "done") {
    return (
      <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-500/15 text-green-500 font-semibold">
        <Check size={16} /> 已加入、前往我的筆記…
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={join}
        disabled={state === "joining"}
        className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg bg-accent text-black font-semibold hover:scale-105 transition disabled:opacity-50"
      >
        {state === "joining" ? <Loader2 size={16} className="animate-spin" /> : <>🤝</>} 加入共同筆記
      </button>
      {state === "error" && <p className="text-xs text-red-400">{msg}</p>}
    </div>
  );
}
