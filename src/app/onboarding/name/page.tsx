"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingNamePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 1) { setError("請輸入顯示名稱"); return; }
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/me/display-name", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name.trim() }),
      }).then((x) => x.json());
      if (!r.ok) { setError(r.message || "儲存失敗"); setLoading(false); return; }
      window.location.href = "/";
    } catch (e: any) { setError(e.message); setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-20">
      <div className="text-center mb-8">
        <div className="text-5xl mb-2">👋</div>
        <h1 className="text-2xl font-bold mb-2">最後一步：取個顯示名稱</h1>
        <p className="text-sm text-fg-muted">這是其他島民會看到的名字，之後可以在「設定」改。</p>
      </div>
      <form onSubmit={submit} className="bg-bg-card border border-border rounded-xl p-6 space-y-3" autoComplete="off">
        <input
          autoFocus value={name} maxLength={40} autoComplete="off"
          onChange={(e) => setName(e.target.value)}
          placeholder="例：航海王魯夫 / Luffy"
          className="w-full px-3 py-2.5 bg-bg-elevated border border-border rounded-lg focus:border-accent outline-none"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={loading || !name.trim()} className="w-full px-4 py-2 bg-accent text-black rounded-lg font-bold hover:scale-[1.02] transition-transform disabled:opacity-50">
          {loading ? "儲存中..." : "🚀 進入 AI 島"}
        </button>
      </form>
    </div>
  );
}
