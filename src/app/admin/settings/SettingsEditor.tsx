"use client";

import { useState } from "react";

type Setting = {
  key: string;
  description?: string | null;
  value: any;
  updated_at?: string | null;
};

/**
 * 把 app_settings JSON 包成「會員看得懂」的表單：
 * 每個 key 配對一個 friendly editor、改完一鍵存。
 * 非技術 admin 也能用。
 */
export function SettingsEditor({ initial }: { initial: Setting[] }) {
  const [rows, setRows] = useState<Setting[]>(initial);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [msgKey, setMsgKey] = useState<{ key: string; text: string } | null>(null);

  const update = (key: string, newValue: any) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, value: newValue } : r)));
  };

  const save = async (key: string) => {
    const row = rows.find((r) => r.key === key);
    if (!row) return;
    setSavingKey(key);
    setMsgKey(null);
    try {
      const res = await fetch("/api/admin/settings", {
      credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: row.value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsgKey({ key, text: `失敗：${data.error}` });
      } else {
        setMsgKey({ key, text: "✅ 已儲存" });
        setRows((rs) => rs.map((r) => (r.key === key ? { ...r, updated_at: new Date().toISOString() } : r)));
        setTimeout(() => setMsgKey(null), 2500);
      }
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-3">
      {rows.map((s) => (
        <SettingCard
          key={s.key}
          setting={s}
          onChange={(v) => update(s.key, v)}
          onSave={() => save(s.key)}
          saving={savingKey === s.key}
          msg={msgKey?.key === s.key ? msgKey.text : null}
        />
      ))}
      {rows.length === 0 && (
        <div className="bg-bg-card border border-border rounded-xl p-12 text-center text-fg-muted text-sm">
          目前沒有設定
        </div>
      )}
    </div>
  );
}

function SettingCard({
  setting,
  onChange,
  onSave,
  saving,
  msg,
}: {
  setting: Setting;
  onChange: (v: any) => void;
  onSave: () => void;
  saving: boolean;
  msg: string | null;
}) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="font-bold flex items-center gap-2">
            {labelFor(setting.key)}
            <code className="text-[10px] text-fg-muted font-mono">{setting.key}</code>
          </div>
          {setting.description && (
            <p className="text-xs text-fg-muted mt-0.5">{setting.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {msg && <span className="text-xs">{msg}</span>}
          <button
            onClick={onSave}
            disabled={saving}
            className="text-xs px-3 py-1 bg-accent text-black font-bold rounded-lg disabled:opacity-50"
          >
            {saving ? "儲存中..." : "💾 儲存"}
          </button>
        </div>
      </div>

      <SettingEditor settingKey={setting.key} value={setting.value} onChange={onChange} />

      {setting.updated_at && (
        <div className="text-[10px] text-fg-muted mt-2">
          最後修改：{new Date(setting.updated_at).toLocaleString("zh-TW")}
        </div>
      )}
    </div>
  );
}

function SettingEditor({ settingKey, value, onChange }: { settingKey: string; value: any; onChange: (v: any) => void }) {
  // 各 key 的客製化 UI
  switch (settingKey) {
    case "signup_enabled":
      return (
        <ToggleRow
          label="開放新使用者註冊"
          value={!!value}
          onChange={onChange}
          help="關閉後、/signup 頁會顯示「暫停註冊」"
        />
      );

    case "island_enabled":
      return (
        <ToggleRow
          label="開放 AI 島嶼 /island"
          value={parseBool(value)}
          onChange={onChange}
          help="關閉後、/island 顯示「敬請期待」、首頁/導覽列入口隱藏（admin 仍可進）"
        />
      );

    case "maintenance_mode":
      return (
        <div className="space-y-2">
          <ToggleRow
            label="啟用維護模式"
            value={!!value?.enabled}
            onChange={(v) => onChange({ ...value, enabled: v })}
            help="開啟後、所有使用者會看到維護中畫面"
          />
          <FieldRow label="維護中顯示的訊息">
            <input
              type="text"
              value={value?.message ?? ""}
              onChange={(e) => onChange({ ...value, message: e.target.value })}
              className={fldCls}
            />
          </FieldRow>
        </div>
      );

    case "site_announcement":
      return (
        <div className="space-y-2">
          <ToggleRow
            label="啟用全站公告 banner"
            value={!!value?.enabled}
            onChange={(v) => onChange({ ...value, enabled: v })}
            help="跟 marquee 不同；這是頂部一條色塊（如：「維護通知」）"
          />
          <FieldRow label="公告內容">
            <input
              type="text"
              value={value?.message ?? ""}
              onChange={(e) => onChange({ ...value, message: e.target.value })}
              className={fldCls}
            />
          </FieldRow>
          <FieldRow label="等級">
            <select
              value={value?.level ?? "info"}
              onChange={(e) => onChange({ ...value, level: e.target.value })}
              className={fldCls}
            >
              <option value="info">藍色（資訊）</option>
              <option value="warning">黃色（警告）</option>
              <option value="danger">紅色（緊急）</option>
              <option value="success">綠色（好消息）</option>
            </select>
          </FieldRow>
        </div>
      );

    case "premium_price":
      return (
        <div className="grid grid-cols-3 gap-2">
          <FieldRow label="月費 NT$">
            <input
              type="number"
              value={value?.monthly ?? 0}
              onChange={(e) => onChange({ ...value, monthly: Number(e.target.value) })}
              className={fldCls}
            />
          </FieldRow>
          <FieldRow label="年費 NT$">
            <input
              type="number"
              value={value?.yearly ?? 0}
              onChange={(e) => onChange({ ...value, yearly: Number(e.target.value) })}
              className={fldCls}
            />
          </FieldRow>
          <FieldRow label="終身 NT$">
            <input
              type="number"
              value={value?.lifetime ?? 0}
              onChange={(e) => onChange({ ...value, lifetime: Number(e.target.value) })}
              className={fldCls}
            />
          </FieldRow>
        </div>
      );

    case "feature_flags":
      return (
        <div className="space-y-2">
          {Object.entries(value ?? {}).map(([k, v]) => (
            <ToggleRow
              key={k}
              label={featureLabel(k)}
              value={!!v}
              onChange={(checked) => onChange({ ...value, [k]: checked })}
              help={featureHelp(k)}
            />
          ))}
          <p className="text-[10px] text-fg-muted">
            新增 flag 請到 Supabase Studio 直接編輯 JSON
          </p>
        </div>
      );

    default:
      // 布林開關（含所有 feature_*_enabled / *_enabled）→ on/off toggle、不要 true/false
      if (typeof value === "boolean" || /_enabled$/.test(settingKey)) {
        return <ToggleRow label="啟用" value={parseBool(value)} onChange={onChange} help={helpFor(settingKey)} />;
      }
      // 其餘（物件 / 字串 / null）→ JSON 編輯
      return <JsonFallback value={value} onChange={onChange} />;
  }
}

function helpFor(key: string): string {
  const map: Record<string, string> = {
    feature_island_enabled: "首頁 3D 島嶼 + /island（關 = 維護頁、入口隱藏）",
    feature_creator_island_enabled: "創作者島嶼 /creator-island（首頁第三模式、預設關、灰度上線）",
    feature_blog_enabled: "/blogs 部落格區（關 = 顯示關閉通知）",
    feature_forum_enabled: "/forum 論壇區（關 = 顯示關閉通知）",
    feature_pet_enabled: "寵物系統開關",
  };
  return map[key] ?? "";
}

function ToggleRow({
  label,
  value,
  onChange,
  help,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  help?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer py-1">
      <span className="relative inline-flex items-center mt-0.5">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <span className="w-9 h-5 bg-bg-elevated rounded-full peer-checked:bg-accent transition" />
        <span className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-4 shadow" />
      </span>
      <span className="flex-1 text-sm">
        <span className="font-medium">{label}</span>
        {help && <p className="text-[10px] text-fg-muted mt-0.5">{help}</p>}
      </span>
      <span className={`text-[10px] font-bold shrink-0 ${value ? "text-emerald-500" : "text-fg-muted"}`}>
        {value ? "ON" : "OFF"}
      </span>
    </label>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs text-fg-muted block mb-1">{label}</span>
      {children}
    </label>
  );
}

function JsonFallback({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const [text, setText] = useState(JSON.stringify(value, null, 2));
  const [err, setErr] = useState<string | null>(null);
  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          try {
            const v = JSON.parse(e.target.value);
            setErr(null);
            onChange(v);
          } catch (er: any) {
            setErr(er.message);
          }
        }}
        rows={4}
        className="w-full bg-bg border border-border rounded-lg p-2 text-xs font-mono"
      />
      {err && <p className="text-xs text-red-400 mt-1">JSON 格式錯誤：{err}</p>}
    </div>
  );
}

const fldCls =
  "w-full bg-bg border border-border rounded-lg px-3 py-1.5 text-sm focus:border-accent outline-none";

function labelFor(key: string): string {
  const map: Record<string, string> = {
    signup_enabled: "🔓 開放註冊",
    island_enabled: "🏝️ 島嶼（舊鍵、改用 feature_island_enabled）",
    feature_island_enabled: "🏝️ 3D 島嶼",
    feature_creator_island_enabled: "🎨 創作者島嶼",
    feature_blog_enabled: "✍️ 部落格",
    feature_forum_enabled: "🗣️ 論壇",
    feature_pet_enabled: "🐾 寵物系統",
    maintenance_mode: "🛠️ 維護模式",
    site_announcement: "📢 全站公告 banner",
    premium_price: "💎 Premium 定價",
    feature_flags: "🚦 功能開關",
  };
  return map[key] ?? key;
}

function parseBool(v: any): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v === "true";
  if (v && typeof v === "object" && "enabled" in v) return !!v.enabled;
  return false;
}

function featureLabel(k: string): string {
  const map: Record<string, string> = {
    discord: "Discord 整合",
    line_login: "LINE 登入",
    ai_companion: "AI 寵物伴讀",
  };
  return map[k] ?? k;
}

function featureHelp(k: string): string {
  const map: Record<string, string> = {
    discord: "Discord 伺服器邀請與整合（未開發完成）",
    line_login: "讓使用者用 LINE 帳號登入",
    ai_companion: "桌寵 AI 夥伴功能（開發中）",
  };
  return map[k] ?? "";
}
