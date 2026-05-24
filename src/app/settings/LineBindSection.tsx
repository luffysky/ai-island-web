"use client";

import { useState } from "react";
import { Loader2, Copy, Check, Unlink, MessageCircle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

// user bot @basicId、給 /settings 加好友 deeplink 用
const USER_BOT_BASIC_ID = process.env.NEXT_PUBLIC_USER_LINE_BOT_BASIC_ID || "";

export function LineBindSection({
  initialBound,
  initialNotifyEnabled,
}: {
  initialBound: boolean;
  initialNotifyEnabled: boolean;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [bound, setBound] = useState(initialBound);
  const [notifyEnabled, setNotifyEnabled] = useState(initialNotifyEnabled);
  const [code, setCode] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/me/line/bind-code", { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "產生失敗");
      setCode(j.code);
    } catch (e: any) {
      toast.error(e?.message || "失敗");
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(`/bind ${code}`);
      setCopied(true);
      toast.success("已複製、貼到 LINE bot 對話送出");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("複製失敗、手動傳「/bind " + code + "」給 bot");
    }
  };

  const unbind = async () => {
    const ok = await confirm({
      title: "解除 LINE 綁定？",
      description: "解除後不再推學習通知到你的 LINE。隨時可重綁。",
      confirmLabel: "解除",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch("/api/me/line/unbind", { method: "POST" });
      if (!res.ok) throw new Error("解除失敗");
      setBound(false);
      setCode("");
      toast.success("已解除");
    } catch (e: any) {
      toast.error(e?.message || "失敗");
    } finally {
      setBusy(false);
    }
  };

  const toggleNotify = async (next: boolean) => {
    setNotifyEnabled(next);
    // 借 profiles 表的 supabase update（前面 SettingsForm 已用 supabase client）
    const { createSupabaseBrowser } = await import("@/lib/supabase-browser");
    const supabase = createSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ line_notify_enabled: next }).eq("id", user.id);
  };

  const lineAddUrl = USER_BOT_BASIC_ID ? `https://line.me/R/ti/p/${USER_BOT_BASIC_ID}` : "";

  return (
    <section className="bg-bg-card border border-border rounded-xl p-6">
      <h2 className="font-bold mb-1 flex items-center gap-2">
        <MessageCircle size={18} className="text-green-400" /> LINE 個人通知
      </h2>
      <p className="text-xs text-fg-muted mb-4">
        綁定 LINE 後、完成 lesson / 升等 / 論壇被回覆 / 解鎖成就會推到你的 LINE。
      </p>

      {bound ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Check size={16} className="text-green-400" />
            <span className="font-medium">已綁定</span>
          </div>

          {/* notify toggle */}
          <label className="flex items-start gap-3 cursor-pointer">
            <span className="relative inline-flex items-center mt-0.5">
              <input
                type="checkbox"
                checked={notifyEnabled}
                onChange={(e) => toggleNotify(e.target.checked)}
                className="sr-only peer"
              />
              <span className="w-9 h-5 bg-bg-elevated rounded-full peer-checked:bg-accent transition" />
              <span className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-4 shadow" />
            </span>
            <span className="flex-1 text-sm">
              <span className="font-medium">收 LINE 通知</span>
              <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">
                關閉後綁定還在、但暫停推送。隨時可開回來。
              </p>
            </span>
          </label>

          <button
            onClick={unbind}
            disabled={busy}
            className="text-xs px-3 py-1.5 rounded-full border border-red-500/40 text-red-400 hover:bg-red-500/10 inline-flex items-center gap-1 disabled:opacity-50"
          >
            <Unlink size={12} />
            解除綁定
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <ol className="text-sm space-y-2 list-decimal list-inside text-fg-muted">
            <li>
              <a
                href={lineAddUrl || "https://line.me/"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline font-medium"
              >
                加 AI 島 bot 為好友
              </a>
              {!lineAddUrl && <span className="text-[10px] ml-1">（管理員尚未設 NEXT_PUBLIC_USER_LINE_BOT_BASIC_ID）</span>}
            </li>
            <li>點下面「取得 6 位 code」</li>
            <li>傳「<code className="font-mono text-fg">/bind 123456</code>」給 bot</li>
          </ol>

          {!code ? (
            <button
              onClick={generate}
              disabled={generating}
              className="px-4 py-2 rounded-lg bg-accent text-black font-bold text-sm inline-flex items-center gap-2 disabled:opacity-50"
            >
              {generating && <Loader2 size={14} className="animate-spin" />}
              取得 6 位 code
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-bg-elevated">
                <code className="font-mono text-2xl font-bold tracking-widest flex-1 text-center text-accent">
                  {code}
                </code>
                <button
                  onClick={copyCode}
                  className="px-3 py-2 rounded-lg bg-bg border border-border text-xs font-medium inline-flex items-center gap-1"
                >
                  {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  複製
                </button>
              </div>
              <p className="text-[11px] text-fg-muted leading-relaxed">
                ⏱️ 5 分鐘內到 LINE bot 傳「<code>/bind {code}</code>」完成綁定。<br />
                過期重點「取得 6 位 code」再來一次。
              </p>
              <button
                onClick={generate}
                disabled={generating}
                className="text-xs text-fg-muted hover:text-accent inline-flex items-center gap-1"
              >
                重新產生 →
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
