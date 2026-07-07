"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { ImageUploader } from "@/components/ui/ImageUploader";

const CAREER_PATHS = [
  { id: "frontend", label: "🌱 前端工匠" },
  { id: "fullstack", label: "🚀 全端戰士" },
  { id: "ai-engineer", label: "🤖 AI 馴獸師" },
  { id: "data", label: "📊 資料煉金術士" },
  { id: "freelance", label: "💼 接案傭兵" },
  { id: "indie", label: "🏝️ 島民創業家" },
];

export function SettingsForm({ profile, email }: { profile: any; email: string }) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [careerPath, setCareerPath] = useState(profile.career_path ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  // 預設 false（不啟用低調）— admin 預設收到通知、user 想要再主動開
  const [notifyOptout, setNotifyOptout] = useState(profile.notify_admin_optout === true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const t = useTranslations("settings");
  const router = useRouter();
  const supabase = createSupabaseBrowser();
  const toast = useToast();
  const confirm = useConfirm();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName || null,
        bio: bio || null,
        career_path: careerPath || null,
        avatar_url: avatarUrl || null,
        notify_admin_optout: notifyOptout,
      })
      .eq("id", profile.id);

    setSaving(false);
    if (error) {
      setMsg(`❌ ${error.message}`);
    } else {
      setMsg(`✅ ${t("saved")}`);
      router.refresh();
    }
  }

  async function handleDeleteAccount() {
    const ok1 = await confirm({
      title: t("deleteConfirm1Title"),
      description: t("deleteConfirm1Desc"),
      confirmLabel: t("nextStep"),
      destructive: true,
    });
    if (!ok1) return;

    const ok2 = await confirm({
      title: t("finalConfirmTitle"),
      description: t("deleteConfirm2Desc"),
      confirmLabel: t("permanentDelete"),
      destructive: true,
    });
    if (!ok2) return;

    const { error } = await supabase.rpc("delete_user_account");
    if (error) {
      toast.error(t("deleteFailedContactSupport", { msg: error.message }));
      return;
    }
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* 基本資料 */}
      <section className="bg-bg-card rounded-xl p-6 space-y-4">
        <h2 className="font-bold text-lg">{t("basicInfo")}</h2>

        <div>
          <label className="block text-sm mb-1">Email</label>
          <input type="email" value={email} disabled className="w-full bg-bg-elevated rounded-lg px-3 py-2 opacity-60" />
          <p className="text-xs text-fg-muted mt-1">{t("cannotEdit")}</p>
        </div>

        <div>
          <label className="block text-sm mb-1">{t("usernameLabel")}</label>
          <input type="text" value={profile.username} disabled className="w-full bg-bg-elevated rounded-lg px-3 py-2 opacity-60" />
          <p className="text-xs text-fg-muted mt-1">{t("cannotEdit")}</p>
        </div>

        <div>
          <label className="block text-sm mb-1">{t("displayNameLabel")}</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-bg-elevated rounded-lg px-3 py-2"
            placeholder={t("displayNamePlaceholder")}
            maxLength={50}
          />
        </div>

        <div>
          <label className="block text-sm mb-2">{t("avatarLabel")}</label>
          <ImageUploader
            folder="avatar"
            value={avatarUrl}
            shape="circle"
            onUploaded={(url) => setAvatarUrl(url)}
            onClear={() => setAvatarUrl("")}
            maxSizeMB={5}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">{t("bioLabel")}</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full bg-bg-elevated rounded-lg px-3 py-2 min-h-[80px]"
            placeholder={t("bioPlaceholder")}
            maxLength={200}
          />
          <p className="text-xs text-fg-muted mt-1">{bio.length} / 200</p>
        </div>

        <div>
          <label className="block text-sm mb-1">{t("careerPathLabel")}</label>
          <select
            value={careerPath}
            onChange={(e) => setCareerPath(e.target.value)}
            className="w-full bg-bg-elevated rounded-lg px-3 py-2"
          >
            <option value="">{t("notSelected")}</option>
            {CAREER_PATHS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>
      </section>

      {/* 隱私 / 通知偏好 */}
      <section className="bg-bg-card border border-border rounded-xl p-6">
        <h2 className="font-bold mb-1">🌙 {t("stealthModeTitle")}</h2>
        <p className="text-xs text-fg-muted mb-4">
          {t("stealthModeDesc")}
        </p>

        <label className="flex items-start gap-3 cursor-pointer">
          <span className="relative inline-flex items-center mt-0.5">
            <input
              type="checkbox"
              checked={notifyOptout}
              onChange={(e) => setNotifyOptout(e.target.checked)}
              className="sr-only peer"
            />
            <span className="w-9 h-5 bg-bg-elevated rounded-full peer-checked:bg-accent transition" />
            <span className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-4 shadow" />
          </span>
          <span className="flex-1 text-sm">
            <span className="font-medium">{t("stealthModeToggle")}</span>
            <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">
              {t("stealthModeHelp1")}
              <br />
              <strong>{t("stealthModeHelp2Strong1")}</strong>{t("stealthModeHelp2Mid")}<strong>{t("stealthModeHelp2Strong2")}</strong>{t("stealthModeHelp2End")}
              <br />
              <span className="text-fg-muted">{t("stealthModeHelp3")}</span>
            </p>
          </span>
        </label>
      </section>

      {/* 儲存按鈕 */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-accent text-black rounded-lg font-semibold hover:bg-accent-2 disabled:opacity-50 transition"
        >
          {saving ? t("saving") : t("save")}
        </button>
        {msg && <span className="text-sm">{msg}</span>}
      </div>

      {/* 危險區 */}
      <section className="bg-red-950/30 border border-red-900/50 rounded-xl p-6 mt-12">
        <h2 className="font-bold text-lg text-red-400 mb-2">⚠️ {t("dangerZone")}</h2>
        <p className="text-sm text-fg-muted mb-4">
          {t("dangerZoneDesc")}
        </p>
        <button
          type="button"
          onClick={handleDeleteAccount}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
        >
          {t("deleteAccount")}
        </button>
      </section>
    </form>
  );
}
