"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BreachDetailForm({ incident }: { incident: any }) {
  const router = useRouter();
  const [form, setForm] = useState({
    incident_type: incident.incident_type ?? "",
    severity: incident.severity ?? "medium",
    affected_user_count: incident.affected_user_count ?? 0,
    affected_data_types: (incident.affected_data_types ?? []).join(", "),
    description: incident.description ?? "",
    root_cause: incident.root_cause ?? "",
    containment_actions: incident.containment_actions ?? "",
    remediation_plan: incident.remediation_plan ?? "",
    status: incident.status ?? "investigating",
    reported_to_authority: !!incident.reported_to_authority,
    authority_reported_at: incident.authority_reported_at ?? "",
    authority_reference: incident.authority_reference ?? "",
    users_notified: !!incident.users_notified,
    users_notified_at: incident.users_notified_at ?? "",
    notification_method: incident.notification_method ?? "",
    resolved_at: incident.resolved_at ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/breach/${incident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          affected_data_types: form.affected_data_types
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean),
          authority_reported_at: form.authority_reported_at || null,
          users_notified_at: form.users_notified_at || null,
          resolved_at: form.resolved_at || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(`失敗：${data.error}`);
      } else {
        setMsg("✅ 已儲存");
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const fld = "w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm focus:border-[var(--color-accent)] outline-none";

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="事件類型">
          <select className={fld} value={form.incident_type} onChange={(e) => set("incident_type", e.target.value)}>
            <option value="unauthorized_access">unauthorized_access 未授權存取</option>
            <option value="data_loss">data_loss 資料遺失</option>
            <option value="system_breach">system_breach 系統入侵</option>
            <option value="leak">leak 外洩</option>
            <option value="other">other 其他</option>
          </select>
        </Field>
        <Field label="嚴重度">
          <select className={fld} value={form.severity} onChange={(e) => set("severity", e.target.value)}>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </select>
        </Field>
        <Field label="狀態">
          <select className={fld} value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="investigating">investigating 調查中</option>
            <option value="contained">contained 已圍堵</option>
            <option value="resolved">resolved 已解決</option>
            <option value="reported">reported 已通報</option>
          </select>
        </Field>
        <Field label="影響用戶數">
          <input type="number" className={fld} value={form.affected_user_count} onChange={(e) => set("affected_user_count", Number(e.target.value))} />
        </Field>
        <Field label="影響資料類型（逗號分隔）" full>
          <input type="text" className={fld} placeholder="email, password_hash, name" value={form.affected_data_types} onChange={(e) => set("affected_data_types", e.target.value)} />
        </Field>
      </div>

      <Field label="事件描述" full>
        <textarea className={fld} rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
      </Field>
      <Field label="根本原因（root_cause）" full>
        <textarea className={fld} rows={3} value={form.root_cause} onChange={(e) => set("root_cause", e.target.value)} />
      </Field>
      <Field label="圍堵措施（containment_actions）" full>
        <textarea className={fld} rows={3} value={form.containment_actions} onChange={(e) => set("containment_actions", e.target.value)} />
      </Field>
      <Field label="補救計畫（remediation_plan）" full>
        <textarea className={fld} rows={3} value={form.remediation_plan} onChange={(e) => set("remediation_plan", e.target.value)} />
      </Field>

      <hr className="border-[var(--color-border)]" />

      <h3 className="font-bold text-sm">通報主管機關</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.reported_to_authority} onChange={(e) => set("reported_to_authority", e.target.checked)} />
          已通報
        </label>
        <Field label="通報時間">
          <input type="datetime-local" className={fld} value={form.authority_reported_at?.slice(0, 16) ?? ""} onChange={(e) => set("authority_reported_at", e.target.value ? new Date(e.target.value).toISOString() : "")} />
        </Field>
        <Field label="案號（authority_reference）">
          <input type="text" className={fld} value={form.authority_reference} onChange={(e) => set("authority_reference", e.target.value)} />
        </Field>
      </div>

      <h3 className="font-bold text-sm">通知當事人</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.users_notified} onChange={(e) => set("users_notified", e.target.checked)} />
          已通知
        </label>
        <Field label="通知時間">
          <input type="datetime-local" className={fld} value={form.users_notified_at?.slice(0, 16) ?? ""} onChange={(e) => set("users_notified_at", e.target.value ? new Date(e.target.value).toISOString() : "")} />
        </Field>
        <Field label="通知方式">
          <select className={fld} value={form.notification_method} onChange={(e) => set("notification_method", e.target.value)}>
            <option value="">—</option>
            <option value="email">email</option>
            <option value="in_app">in_app 站內</option>
            <option value="sms">sms 簡訊</option>
            <option value="public_announcement">public_announcement 公開公告</option>
          </select>
        </Field>
      </div>

      <Field label="resolved_at（解決時間、僅在 status=resolved 時填）">
        <input type="datetime-local" className={fld} value={form.resolved_at?.slice(0, 16) ?? ""} onChange={(e) => set("resolved_at", e.target.value ? new Date(e.target.value).toISOString() : "")} />
      </Field>

      <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
        {msg && <span className="text-xs">{msg}</span>}
        <button
          onClick={save}
          disabled={saving}
          className="ml-auto px-5 py-2 rounded-lg bg-[var(--color-accent)] text-black font-bold text-sm disabled:opacity-50"
        >
          {saving ? "儲存中..." : "💾 儲存"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-3" : ""}>
      <label className="text-xs text-[var(--color-fg-muted)] block mb-1">{label}</label>
      {children}
    </div>
  );
}
