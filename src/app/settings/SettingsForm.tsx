"use client";
import { useState } from "react";
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
      setMsg("✅ 已儲存");
      router.refresh();
    }
  }

  async function handleDeleteAccount() {
    const ok1 = await confirm({
      title: "確定要刪除帳號？",
      description: "這個動作不可逆、所有資料都會被永久移除。",
      confirmLabel: "下一步",
      destructive: true,
    });
    if (!ok1) return;

    const ok2 = await confirm({
      title: "最後確認",
      description: "所有進度、成就、筆記、文章都會一起刪除。確定繼續？",
      confirmLabel: "永久刪除",
      destructive: true,
    });
    if (!ok2) return;

    const { error } = await supabase.rpc("delete_user_account");
    if (error) {
      toast.error(`刪除失敗：${error.message}、請聯絡客服`);
      return;
    }
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* 基本資料 */}
      <section className="bg-bg-card rounded-xl p-6 space-y-4">
        <h2 className="font-bold text-lg">基本資料</h2>

        <div>
          <label className="block text-sm mb-1">Email</label>
          <input type="email" value={email} disabled className="w-full bg-bg-elevated rounded-lg px-3 py-2 opacity-60" />
          <p className="text-xs text-fg-muted mt-1">無法修改</p>
        </div>

        <div>
          <label className="block text-sm mb-1">Username（公開、@xxxxx）</label>
          <input type="text" value={profile.username} disabled className="w-full bg-bg-elevated rounded-lg px-3 py-2 opacity-60" />
          <p className="text-xs text-fg-muted mt-1">無法修改</p>
        </div>

        <div>
          <label className="block text-sm mb-1">顯示名稱</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-bg-elevated rounded-lg px-3 py-2"
            placeholder="想被叫什麼？"
            maxLength={50}
          />
        </div>

        <div>
          <label className="block text-sm mb-2">頭像</label>
          <div className="flex items-start gap-4 flex-wrap">
            <ImageUploader
              folder="avatar"
              value={avatarUrl}
              shape="circle"
              onUploaded={(url) => setAvatarUrl(url)}
              onClear={() => setAvatarUrl("")}
              maxSizeMB={5}
            />
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-fg-muted mb-1">或貼圖片網址</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full bg-bg-elevated rounded-lg px-3 py-2 text-sm"
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">自我介紹</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full bg-bg-elevated rounded-lg px-3 py-2 min-h-[80px]"
            placeholder="跟大家介紹一下..."
            maxLength={200}
          />
          <p className="text-xs text-fg-muted mt-1">{bio.length} / 200</p>
        </div>

        <div>
          <label className="block text-sm mb-1">職業路線</label>
          <select
            value={careerPath}
            onChange={(e) => setCareerPath(e.target.value)}
            className="w-full bg-bg-elevated rounded-lg px-3 py-2"
          >
            <option value="">未選擇</option>
            {CAREER_PATHS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>
      </section>

      {/* 隱私 / 通知偏好 */}
      <section className="bg-bg-card border border-border rounded-xl p-6">
        <h2 className="font-bold mb-1">🌙 低調模式</h2>
        <p className="text-xs text-fg-muted mb-4">
          影響平台運營端是否會「即時」感知到你的學習動態。學習進度 / XP / 排行榜照常記錄、不受影響。
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
            <span className="font-medium">啟用低調模式</span>
            <p className="text-xs text-fg-muted mt-0.5 leading-relaxed">
              預設關閉。平台運營端會收到你的個人學習動態（登入 / 完課 / 升等 / 解鎖成就 / 論壇互動）即時通知、用於監看平台健康 + 第一時間替你慶祝里程碑。
              <br />
              <strong>啟用此選項</strong>後、你的活動<strong>不會即時推播</strong>到平台運營端。
              <br />
              <span className="text-fg-muted">兩種模式下、你的學習資料儲存 / 排行榜 / 統計都完全一樣、不會差。</span>
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
          {saving ? "儲存中..." : "儲存"}
        </button>
        {msg && <span className="text-sm">{msg}</span>}
      </div>

      {/* 危險區 */}
      <section className="bg-red-950/30 border border-red-900/50 rounded-xl p-6 mt-12">
        <h2 className="font-bold text-lg text-red-400 mb-2">⚠️ 危險區</h2>
        <p className="text-sm text-fg-muted mb-4">
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
