"use client";
import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

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
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const router = useRouter();
  const supabase = createSupabaseBrowser();

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
      })
      .eq("id", profile.id);

    setSaving(false);
    if (error) {
      setMsg(`❌ ${error.message}`);
    } else {
      setMsg("✅ 已儲存");
      router.refresh();
    }
  }

  async function handleDeleteAccount() {
    if (!confirm("確定要刪除帳號？這個動作不可逆。")) return;
    if (!confirm("最後確認：所有進度、成就、筆記都會刪除。")) return;

    const { error } = await supabase.rpc("delete_user_account");
    if (error) {
      alert(`刪除失敗：${error.message}\n請聯絡客服`);
      return;
    }
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* 基本資料 */}
      <section className="bg-[var(--color-bg-card)] rounded-xl p-6 space-y-4">
        <h2 className="font-bold text-lg">基本資料</h2>

        <div>
          <label className="block text-sm mb-1">Email</label>
          <input type="email" value={email} disabled className="w-full bg-[var(--color-bg-elevated)] rounded-lg px-3 py-2 opacity-60" />
          <p className="text-xs text-[var(--color-fg-muted)] mt-1">無法修改</p>
        </div>

        <div>
          <label className="block text-sm mb-1">Username（公開、@xxxxx）</label>
          <input type="text" value={profile.username} disabled className="w-full bg-[var(--color-bg-elevated)] rounded-lg px-3 py-2 opacity-60" />
          <p className="text-xs text-[var(--color-fg-muted)] mt-1">無法修改</p>
        </div>

        <div>
          <label className="block text-sm mb-1">顯示名稱</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-[var(--color-bg-elevated)] rounded-lg px-3 py-2"
            placeholder="想被叫什麼？"
            maxLength={50}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">頭像 URL</label>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="w-full bg-[var(--color-bg-elevated)] rounded-lg px-3 py-2"
            placeholder="https://..."
          />
          {avatarUrl && <img src={avatarUrl} alt="" className="w-16 h-16 rounded-full mt-2" />}
        </div>

        <div>
          <label className="block text-sm mb-1">自我介紹</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full bg-[var(--color-bg-elevated)] rounded-lg px-3 py-2 min-h-[80px]"
            placeholder="跟大家介紹一下..."
            maxLength={200}
          />
          <p className="text-xs text-[var(--color-fg-muted)] mt-1">{bio.length} / 200</p>
        </div>

        <div>
          <label className="block text-sm mb-1">職業路線</label>
          <select
            value={careerPath}
            onChange={(e) => setCareerPath(e.target.value)}
            className="w-full bg-[var(--color-bg-elevated)] rounded-lg px-3 py-2"
          >
            <option value="">未選擇</option>
            {CAREER_PATHS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>
      </section>

      {/* 儲存按鈕 */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-[var(--color-accent)] text-black rounded-lg font-semibold hover:bg-[var(--color-accent-2)] disabled:opacity-50 transition"
        >
          {saving ? "儲存中..." : "儲存"}
        </button>
        {msg && <span className="text-sm">{msg}</span>}
      </div>

      {/* 危險區 */}
      <section className="bg-red-950/30 border border-red-900/50 rounded-xl p-6 mt-12">
        <h2 className="font-bold text-lg text-red-400 mb-2">⚠️ 危險區</h2>
        <p className="text-sm text-[var(--color-fg-muted)] mb-4">
          刪除帳號會永久移除所有資料、且不可恢復。
        </p>
        <button
          type="button"
          onClick={handleDeleteAccount}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
        >
          刪除帳號
        </button>
      </section>
    </form>
  );
}
