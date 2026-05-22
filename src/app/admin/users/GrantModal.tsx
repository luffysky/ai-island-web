"use client";

import { useState } from "react";
import { X, Gift } from "lucide-react";

type GrantType = "xp" | "zcoin" | "achievement";

export function GrantModal({
  user,
  onClose,
  onDone,
}: {
  user: any;
  onClose: () => void;
  onDone?: (kind: GrantType, payload: any) => void;
}) {
  const [type, setType] = useState<GrantType>("xp");
  const [amount, setAmount] = useState(100);
  const [achievementId, setAchievementId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async () => {
    setMsg(null);
    if (reason.trim().length < 5) {
      setMsg("理由必填、至少 5 字");
      return;
    }
    setBusy(true);
    try {
      let endpoint = "";
      let body: any = { userId: user.id, reason: reason.trim() };
      if (type === "xp") {
        endpoint = "/api/admin/grant/xp";
        body.amount = amount;
      } else if (type === "zcoin") {
        endpoint = "/api/admin/grant/zcoin";
        body.amount = amount;
      } else {
        endpoint = "/api/admin/grant/achievement";
        body.achievementId = achievementId.trim();
        if (!achievementId.trim()) {
          setMsg("請輸入 achievement id");
          setBusy(false);
          return;
        }
      }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(`失敗：${data.error}${data.minLen ? `（${data.minLen} 字以上）` : ""}${data.limit ? `（上限 ${data.limit}）` : ""}`);
      } else {
        setMsg("✅ 已發放");
        onDone?.(type, data);
        setTimeout(onClose, 700);
      }
    } catch (e: any) {
      setMsg(`失敗：${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <Gift size={18} className="text-[var(--color-accent)]" />
            <h3 className="font-bold">補帳：{user.display_name || user.username}</h3>
          </div>
          <button onClick={onClose} className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="text-xs text-[var(--color-fg-muted)] block mb-1">類型</label>
            <div className="grid grid-cols-3 gap-1.5">
              {([
                { v: "xp", label: "⚡ XP" },
                { v: "zcoin", label: "🪙 Z-coin" },
                { v: "achievement", label: "🏆 成就" },
              ] as const).map((t) => (
                <button
                  key={t.v}
                  onClick={() => setType(t.v as GrantType)}
                  className={`text-xs px-2 py-1.5 rounded-lg border transition ${
                    type === t.v
                      ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-bold"
                      : "border-[var(--color-border)] hover:border-[var(--color-accent)]/50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {(type === "xp" || type === "zcoin") && (
            <div>
              <label className="text-xs text-[var(--color-fg-muted)] block mb-1">
                數值（正數=發放、負數=扣除、目前餘額 {type === "xp" ? user.xp ?? 0 : user.z_coin ?? 0}）
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-sm focus:border-[var(--color-accent)] outline-none"
              />
              <p className="text-[10px] text-[var(--color-fg-muted)] mt-1">
                {type === "xp" ? "單次上限 ±10000" : "單次上限 ±5000"}
              </p>
            </div>
          )}

          {type === "achievement" && (
            <div>
              <label className="text-xs text-[var(--color-fg-muted)] block mb-1">
                Achievement ID（在 /admin/achievements 看代號）
              </label>
              <input
                type="text"
                value={achievementId}
                onChange={(e) => setAchievementId(e.target.value)}
                placeholder="first-lesson"
                className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-sm focus:border-[var(--color-accent)] outline-none"
              />
            </div>
          )}

          <div>
            <label className="text-xs text-[var(--color-fg-muted)] block mb-1">
              理由（必填、≥ 5 字、會寫進 audit log）
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="例：4/1 活動補償、客服案件修復"
              className="w-full px-3 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-sm focus:border-[var(--color-accent)] outline-none resize-none"
            />
          </div>

          {msg && (
            <p className="text-xs text-[var(--color-accent)]">{msg}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm rounded-lg border border-[var(--color-border)]"
            >
              取消
            </button>
            <button
              onClick={submit}
              disabled={busy}
              className="px-4 py-1.5 text-sm rounded-lg bg-[var(--color-accent)] text-black font-bold disabled:opacity-50"
            >
              {busy ? "處理中..." : "確認發放"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
