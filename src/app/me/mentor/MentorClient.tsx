"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, LogOut, Users, GraduationCap, Handshake } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { AnimatedEmojiPicker } from "@/components/ui/AnimatedEmojiPicker";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useTranslations } from "next-intl";

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
  const toast = useToast();
  const confirm = useConfirm();
  const t = useTranslations("mentor");
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
    if (!role) { toast.error(t("mentorSelectRole")); return; }
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
      else toast.error(j.error ?? t("mentorSaveFailed"));
    } finally { setSaving(false); }
  }

  async function exit() {
    if (!(await confirm({ title: t("mentorExitTitle"), destructive: true, confirmLabel: t("mentorExitConfirm") }))) return;
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
        <h3 className="font-bold mb-3">{mine ? t("mentorFormTitleUpdate") : t("mentorFormTitleCreate")}</h3>

        <label className="text-sm font-medium block mb-2">{t("mentorRoleLabel")}</label>
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

        <label className="text-xs text-fg-muted">{t("mentorBioLabel")}</label>
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={500}
          placeholder={t("mentorBioPlaceholder")}
          className="w-full bg-bg-elevated border border-border rounded p-2 text-sm" />
        <div className="mb-3 mt-0.5"><AnimatedEmojiPicker onSelect={(e) => setBio((v) => v + e)} /></div>

        <label className="text-xs text-fg-muted">{t("mentorTopicsLabel", { list: TOPIC_SUGGEST.slice(0, 6).join(" / ") })}</label>
        <input value={topicsRaw} onChange={(e) => setTopicsRaw(e.target.value)}
          placeholder="react, typescript, ai-engineering"
          className="w-full bg-bg-elevated border border-border rounded p-2 text-sm mb-3" />

        <label className="text-xs text-fg-muted">{t("mentorAvailabilityLabel")}</label>
        <input value={availability} onChange={(e) => setAvailability(e.target.value)}
          placeholder={t("mentorAvailabilityPlaceholder")}
          className="w-full bg-bg-elevated border border-border rounded p-2 text-sm mb-3" />

        <label className="text-xs text-fg-muted">{t("mentorContactLabel")}</label>
        <input value={contactMethod} onChange={(e) => setContactMethod(e.target.value)}
          placeholder={t("mentorContactPlaceholder")}
          className="w-full bg-bg-elevated border border-border rounded p-2 text-sm mb-3" />

        <div className="flex gap-2">
          <button onClick={save} disabled={saving || !role}
            className="btn-chip btn-chip-success flex-1 justify-center py-2.5 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {mine ? t("mentorUpdate") : t("mentorCreate")}
          </button>
          {mine && (
            <button onClick={exit} className="btn-chip btn-chip-danger">
              <LogOut size={12} /> {t("mentorExitMatch")}
            </button>
          )}
        </div>
      </div>

      {/* 候選 */}
      {mine && (
        <div className="bg-bg-card border border-border rounded-xl p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Users size={16} /> {t("mentorCandidatesTitle", { n: candidates.length })}
          </h3>
          {candidates.length === 0 ? (
            <p className="text-sm text-fg-muted py-6 text-center">{t("mentorNoCandidates")}</p>
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
                      {c.overlap > 0 && <span className="chip chip-success text-[10px]">🎯 {t("mentorCommonTopics", { n: c.overlap })}</span>}
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
