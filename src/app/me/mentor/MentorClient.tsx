"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, LogOut, Users, GraduationCap, Handshake } from "lucide-react";

const ROLES = [
  { value: "mentor",  label: "我想當 mentor 帶人",   emoji: "🎓", desc: "你已有經驗、想 give back、教更新的學員" },
  { value: "mentee",  label: "我想找 mentor 帶我",   emoji: "🌱", desc: "想被 1-on-1 指導、有人幫你看 code / 解疑問" },
  { value: "peer",    label: "找 peer 一起學",        emoji: "🤝", desc: "進度相近、互相督促、一起卡關一起爆肝" },
];

const TOPIC_SUGGEST = [
  "react", "vue", "nextjs", "typescript", "python", "fastapi", "django",
  "ai-engineering", "llm", "rag", "embeddings", "vector-db",
  "system-design", "algorithm", "database", "sql",
  "indie", "startup", "saas", "freelance",
];

export function MentorClient() {
  const [state, setState] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [bio, setBio] = useState("");
  const [topicsRaw, setTopicsRaw] = useState("");
  const [availability, setAvailability] = useState("");
  const [contactMethod, setContactMethod] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/me/mentor", { credentials: "include" });
      const j = await r.json();
      setState(j);
      if (j.mine) {
        setRole(j.mine.role);
        setBio(j.mine.bio ?? "");
        setTopicsRaw((j.mine.topics ?? []).join(", "));
        setAvailability(j.mine.availability ?? "");
        setContactMethod(j.mine.contact_method ?? "");
      }
    } finally { setLoading(false); }
  }

  async function save() {
    if (!role) { alert("先選身份"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/me/mentor", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role, bio, availability, contact_method: contactMethod,
          topics: topicsRaw.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      const j = await r.json();
      if (j.ok) await load();
      else alert(`❌ ${j.error}`);
    } finally { setSaving(false); }
  }

  async function exit() {
    if (!confirm("退出配對、不再被其他人看到？")) return;
    await fetch("/api/me/mentor", { method: "DELETE", credentials: "include" });
    await load();
  }

  if (loading) return <div className="py-16 text-center"><Loader2 size={20} className="animate-spin mx-auto" /></div>;

  const candidates = state?.candidates ?? [];
  const mine = state?.mine;

  return (
    <div className="space-y-4">
      {/* 設定 */}
      <div className="bg-bg-card border border-border rounded-xl p-5">
        <h3 className="font-bold mb-3">{mine ? "更新我的配對設定" : "建立配對 profile"}</h3>

        <label className="text-sm font-medium block mb-2">身份</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
          {ROLES.map((r) => (
            <button key={r.value} onClick={() => setRole(r.value)}
              className={`text-left rounded-lg p-3 border transition ${role === r.value ? "border-accent bg-accent/10" : "border-border bg-bg-elevated hover:border-accent/40"}`}>
              <div className="text-xl mb-1">{r.emoji}</div>
              <div className="font-bold text-sm mb-0.5">{r.label}</div>
              <div className="text-[10px] text-fg-muted leading-snug">{r.desc}</div>
            </button>
          ))}
        </div>

        <label className="text-xs text-fg-muted">自介（可選、給對方看你想做什麼 / 想學什麼）</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={500}
          placeholder="例：學 React 半年、想找有經驗的 mentor 幫看 PR、晚上有空..."
          className="w-full bg-bg-elevated border border-border rounded p-2 text-sm mb-3" />

        <label className="text-xs text-fg-muted">主題（逗號分隔、推：{TOPIC_SUGGEST.slice(0, 6).join(" / ")}...）</label>
        <input value={topicsRaw} onChange={(e) => setTopicsRaw(e.target.value)}
          placeholder="react, typescript, ai-engineering"
          className="w-full bg-bg-elevated border border-border rounded p-2 text-sm mb-3" />

        <label className="text-xs text-fg-muted">可用時段</label>
        <input value={availability} onChange={(e) => setAvailability(e.target.value)}
          placeholder="例：平日晚上 / 週末"
          className="w-full bg-bg-elevated border border-border rounded p-2 text-sm mb-3" />

        <label className="text-xs text-fg-muted">聯絡方式（給配對成功的人）</label>
        <input value={contactMethod} onChange={(e) => setContactMethod(e.target.value)}
          placeholder="例：discord:xxx 或 line:xxx"
          className="w-full bg-bg-elevated border border-border rounded p-2 text-sm mb-3" />

        <div className="flex gap-2">
          <button onClick={save} disabled={saving || !role}
            className="btn-chip btn-chip-success flex-1 justify-center py-2.5 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {mine ? "更新" : "建立"}
          </button>
          {mine && (
            <button onClick={exit} className="btn-chip btn-chip-danger">
              <LogOut size={12} /> 退出配對
            </button>
          )}
        </div>
      </div>

      {/* 候選 */}
      {mine && (
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Users size={16} /> 為你推薦的配對候選（{candidates.length}）
          </h3>
          {candidates.length === 0 ? (
            <p className="text-sm text-fg-muted py-6 text-center">還沒有適合的、晚點再來看 / 邀請朋友來</p>
          ) : (
            <div className="space-y-2">
              {candidates.map((c: any) => {
                const roleMeta = ROLES.find((r) => r.value === c.role);
                return (
                  <div key={c.user_id} className="bg-bg-elevated rounded-lg p-3 border border-border">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">{roleMeta?.emoji}</span>
                      <span className="font-bold">{c.name}</span>
                      <span className="chip chip-neutral text-[10px]">Lv {c.level}</span>
                      <span className="chip chip-info text-[10px]">{roleMeta?.label}</span>
                      {c.overlap > 0 && <span className="chip chip-success text-[10px]">🎯 {c.overlap} 共同主題</span>}
                    </div>
                    {c.bio && <p className="text-sm text-fg-muted mb-1.5">{c.bio}</p>}
                    {c.topics?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {c.topics.slice(0, 6).map((t: string) => (
                          <span key={t} className="chip chip-neutral text-[9px]">#{t}</span>
                        ))}
                      </div>
                    )}
                    {c.availability && <p className="text-[11px] text-fg-muted">⏰ {c.availability}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
