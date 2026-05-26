"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { MessageCircle, X, Copy, ExternalLink, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const DISMISS_KEY = "line-bind-banner-dismissed-until";
const DISMISS_DAYS = 7;

const BOT_BASIC_ID = process.env.NEXT_PUBLIC_USER_LINE_BOT_BASIC_ID || "";

/**
 * user 沒綁 LINE 時、在前台顯示一條 banner、引導綁定。
 * 已綁 / 7 天內按過「之後再說」會隱藏。
 */
export function LineBindBanner() {
  const supabase = createSupabaseBrowser();
  const toast = useToast();
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [loadingCode, setLoadingCode] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // 已綁? 不顯示
      const { data: profile } = await supabase
        .from("profiles")
        .select("line_user_id")
        .eq("id", user.id)
        .single();
      if (profile?.line_user_id) return;
      // 7 天內 dismiss 過? 不顯示
      const until = Number(localStorage.getItem(DISMISS_KEY) || "0");
      if (until > Date.now()) return;
      setShow(true);
    })();
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86400_000));
    setShow(false);
  };

  const getCode = async () => {
    setLoadingCode(true);
    try {
      const res = await fetch("/api/me/line/bind-code", {
      credentials: "include", method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || j.message);
      setCode(j.code);
    } catch (e: any) {
      toast.error(e?.message || "拿 code 失敗");
    } finally {
      setLoadingCode(false);
    }
  };

  const copyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(`/bind ${code}`);
    toast.success("已複製、貼到 LINE 對話框送出");
  };

  if (!show) return null;

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-md w-[calc(100vw-2rem)]">
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-md border border-green-500/40 rounded-2xl p-3 shadow-2xl flex items-center gap-2">
          <MessageCircle size={18} className="text-green-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold">綁定 LINE 收即時通知</div>
            <div className="text-[10px] text-fg-muted">完課 / 升等 / 解鎖成就 / 客服回覆都會推到 LINE</div>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="flex-shrink-0 px-3 py-1.5 rounded-full bg-green-500 text-white text-xs font-bold"
          >
            綁定
          </button>
          <button onClick={dismiss} className="flex-shrink-0 p-1 text-fg-muted hover:text-fg" title="之後再說">
            <X size={14} />
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-bg-card border border-border rounded-2xl w-full max-w-md">
            <div className="border-b border-border px-4 py-3 flex items-center justify-between">
              <h3 className="font-bold inline-flex items-center gap-2">
                <MessageCircle size={16} className="text-green-400" /> 綁定 LINE 個人通知
              </h3>
              <button onClick={() => setOpen(false)} className="p-1 text-fg-muted hover:text-fg">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <p>3 步驟搞定：</p>

              {/* Step 1 */}
              <div className="bg-bg-elevated rounded-lg p-3">
                <div className="font-bold mb-2">1️⃣ 加 AI 島 bot 為好友</div>
                {BOT_BASIC_ID ? (
                  <a
                    href={`https://line.me/R/ti/p/${BOT_BASIC_ID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-500 text-white text-xs font-bold"
                  >
                    <ExternalLink size={11} /> 開 LINE 加好友
                  </a>
                ) : (
                  <span className="text-xs text-fg-muted">（管理員還沒設 BOT_BASIC_ID）</span>
                )}
              </div>

              {/* Step 2 */}
              <div className="bg-bg-elevated rounded-lg p-3">
                <div className="font-bold mb-2">2️⃣ 拿 6 位綁定碼</div>
                {!code ? (
                  <button
                    onClick={getCode}
                    disabled={loadingCode}
                    className="px-3 py-1.5 rounded-full bg-accent text-black text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    {loadingCode ? <Loader2 size={11} className="animate-spin" /> : null}
                    產生綁定碼
                  </button>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <code className="text-2xl font-bold tracking-wider bg-bg px-3 py-1 rounded text-accent">{code}</code>
                      <button onClick={copyCode} className="px-2 py-1 rounded border border-border hover:border-accent inline-flex items-center gap-1 text-xs">
                        <Copy size={11} /> 複製 /bind {code}
                      </button>
                    </div>
                    <p className="text-[10px] text-fg-muted">⏰ code 5 分鐘有效、過期就重拿</p>
                  </div>
                )}
              </div>

              {/* Step 3 */}
              <div className="bg-bg-elevated rounded-lg p-3">
                <div className="font-bold mb-1">3️⃣ 把「<code className="text-accent">/bind {code || "XXXXXX"}</code>」傳給 bot</div>
                <p className="text-[10px] text-fg-muted">bot 回「✅ 綁定成功」就完成、之後系統推訊息會自動到你 LINE。</p>
              </div>

              <p className="text-[10px] text-fg-muted text-center pt-2">
                綁完想關通知 / 解綁 → 到 <a href="/settings" className="text-accent hover:underline">設定</a>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
