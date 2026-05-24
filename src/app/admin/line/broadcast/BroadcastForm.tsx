"use client";

import { useState } from "react";
import { Send, Loader2, Users, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

type Audience = "respecting_optout" | "all_bound";

export function BroadcastForm({
  totalBound,
  notifyOnCount,
}: {
  totalBound: number;
  notifyOnCount: number;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [text, setText] = useState("");
  const [audience, setAudience] = useState<Audience>("respecting_optout");
  const [sending, setSending] = useState(false);

  const targetCount = audience === "respecting_optout" ? notifyOnCount : totalBound;

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    const ok = await confirm({
      title: `群發給 ${targetCount} 人？`,
      description: `${audience === "all_bound" ? "⚠️ 會忽略 user opt-out、強制送" : "尊重 opt-out（已關通知者不送）"}。\n\n訊息：\n${body.slice(0, 200)}${body.length > 200 ? "…" : ""}`,
      confirmLabel: `送出（${targetCount} 人）`,
      destructive: audience === "all_bound",
    });
    if (!ok) return;

    setSending(true);
    try {
      const res = await fetch("/api/admin/line/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body, respect_optout: audience === "respecting_optout" }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || j.error || "群發失敗");
      toast.success(`已送出 ${j.sent} / ${j.total}`);
      setText("");
    } catch (e: any) {
      toast.error(e?.message || "群發失敗");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 對象選擇 */}
      <section className="bg-bg-card border border-border rounded-xl p-4 space-y-3">
        <h2 className="font-bold text-sm flex items-center gap-2">
          <Users size={14} /> 對象
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <button
            onClick={() => setAudience("respecting_optout")}
            className={`text-left p-3 rounded-lg border transition ${
              audience === "respecting_optout"
                ? "border-accent bg-accent/10"
                : "border-border hover:border-accent/50"
            }`}
          >
            <div className="font-bold text-sm">✅ 尊重 opt-out（建議）</div>
            <div className="text-xs text-fg-muted mt-1">
              已綁 + 「收通知」開的 user：<b className="text-fg">{notifyOnCount}</b> 人
            </div>
          </button>
          <button
            onClick={() => setAudience("all_bound")}
            className={`text-left p-3 rounded-lg border transition ${
              audience === "all_bound"
                ? "border-yellow-500 bg-yellow-500/10"
                : "border-border hover:border-accent/50"
            }`}
          >
            <div className="font-bold text-sm flex items-center gap-1">
              <AlertTriangle size={12} className="text-yellow-400" />
              全部綁定 user（強制）
            </div>
            <div className="text-xs text-fg-muted mt-1">
              所有綁了 LINE 的：<b className="text-fg">{totalBound}</b> 人
              <br />
              <span className="text-yellow-400">會 bypass user opt-out、僅用於重要公告 / 維護通知</span>
            </div>
          </button>
        </div>
      </section>

      {/* 訊息 */}
      <section className="bg-bg-card border border-border rounded-xl p-4 space-y-3">
        <h2 className="font-bold text-sm">📨 訊息內容</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="例如：「🏝️ AI 島維護通知：明日凌晨 2:00-4:00 系統升級、屆時無法登入。造成不便、感謝諒解。」"
          rows={6}
          maxLength={4900}
          className="w-full bg-bg border border-border rounded-lg p-3 text-sm outline-none focus:border-accent resize-y"
        />
        <div className="text-xs text-fg-muted flex items-center justify-between">
          <span>{text.length} / 4900</span>
          <span>支援多行、無 Flex（之後可加 Flex 模板）</span>
        </div>
      </section>

      {/* 預估 + 送出 */}
      <section className="flex items-center justify-between gap-3 bg-bg-elevated rounded-xl p-4">
        <div className="text-sm">
          <div className="font-bold">預估送達 {targetCount} 人</div>
          <div className="text-xs text-fg-muted mt-0.5">
            LINE 限制每 500 人 / multicast、會自動分批
          </div>
        </div>
        <button
          onClick={send}
          disabled={!text.trim() || sending || targetCount === 0}
          className="px-5 py-2.5 rounded-full bg-accent text-black font-bold text-sm inline-flex items-center gap-1 disabled:opacity-50"
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          送出群發
        </button>
      </section>
    </div>
  );
}
