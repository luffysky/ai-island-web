"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { X, ArrowRight, ArrowLeft, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

/**
 * 新手 Wizard 3 步（B 方案）
 *
 * 林董：「註冊完跳『選職涯路線 → 選寵物 → 第一課』三步精靈」
 *
 * 觸發：未填 career_path + 未選寵物 + 第一次到 /me / / 首頁
 * 結果：寫 profiles.career_path + onboarding_pet_picked + onboarding_starting_chapter
 *      看完跳到推薦的第一章
 */
const STORAGE_KEY = "ai_island_wizard_done_v1";

const CAREERS = [
  { id: "frontend", name: "前端工程師", emoji: "🎨", desc: "React / Vue / 切版 / 動畫", starting: 1 },
  { id: "fullstack", name: "全端工程師", emoji: "🛡️", desc: "前後端 + DB + 部署", starting: 1 },
  { id: "ai-engineer", name: "AI 工程師", emoji: "🤖", desc: "Prompt / RAG / Agent / 模型", starting: 46 },
  { id: "data", name: "資料 / 分析", emoji: "📊", desc: "Python / SQL / BI / ML", starting: 17 },
  { id: "indie", name: "Indie / 一人公司", emoji: "🚀", desc: "全端 + 行銷 + 商業", starting: 1 },
  { id: "freelance", name: "接案 / 自由", emoji: "💼", desc: "WordPress / SEO / 客戶溝通", starting: 37 },
];

const PETS = [
  { id: "hamster", name: "招財倉鼠", emoji: "🐹", voice: "活潑、會囤食物" },
  { id: "cat", name: "Mochi 貓", emoji: "🐱", voice: "高冷、慢熟、機敏" },
  { id: "dog", name: "Lucky 狗", emoji: "🐶", voice: "熱情、忠誠、誇人不手軟" },
  { id: "rabbit", name: "麻糬兔", emoji: "🐰", voice: "溫柔、軟、安靜" },
];

export function OnboardingWizard() {
  const { status } = useAuth();
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [career, setCareer] = useState<string | null>(null);
  const [pet, setPet] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const checkedRef = useRef(false);

  useEffect(() => {
    if (status !== "in") return;
    if (checkedRef.current) return;
    checkedRef.current = true;
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {}
    const allow = pathname === "/" || pathname === "/me";
    if (!allow) return;

    fetch("/api/me/onboarding-state")
      .then((r) => r.json())
      .then((j) => {
        if (j?.wizard_completed_at || (j?.career_path && j?.pet_picked)) {
          try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
          return;
        }
        setOpen(true);
      })
      .catch(() => {});
  }, [status, pathname]);

  const finish = async (skip = false) => {
    setSaving(true);
    try {
      await fetch("/api/me/onboarding-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "wizard",
          career_path: skip ? null : career,
          pet_picked: skip ? null : pet,
        }),
      });
    } catch {}
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setSaving(false);
    setOpen(false);

    if (!skip && career) {
      const chapterId = CAREERS.find((c) => c.id === career)?.starting ?? 1;
      router.push(`/chapters/${chapterId}` as any);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-bg-card border border-border rounded-3xl shadow-2xl overflow-hidden">
        {/* header */}
        <div className="px-6 pt-5 pb-3 bg-gradient-to-r from-accent/10 via-accent-2/10 to-transparent">
          <button onClick={() => finish(true)} aria-label="跳過" className="absolute top-3 right-3 p-1.5 rounded-full text-fg-muted hover:bg-bg-elevated">
            <X size={14} />
          </button>
          <div className="text-[10px] text-fg-muted">歡迎來到 AI 島 · 3 步入門</div>
          <div className="flex items-center gap-2 mt-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition ${i <= step ? "bg-gradient-to-r from-accent to-accent-2" : "bg-bg-elevated"}`} />
            ))}
          </div>
        </div>

        <div className="p-6">
          {step === 0 && (
            <>
              <h2 className="text-2xl font-bold mb-1">想學什麼方向？</h2>
              <p className="text-sm text-fg-muted mb-5">先選一條、之後隨時可改。</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CAREERS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCareer(c.id)}
                    className={`p-3 rounded-xl border text-left transition ${career === c.id ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"}`}
                  >
                    <div className="text-2xl">{c.emoji}</div>
                    <div className="font-bold text-sm mt-1">{c.name}</div>
                    <div className="text-[10px] text-fg-muted mt-0.5 leading-tight">{c.desc}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="text-2xl font-bold mb-1">選一隻寵物陪你</h2>
              <p className="text-sm text-fg-muted mb-5">會記你的學習狀態、會主動講話。</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PETS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPet(p.id)}
                    className={`p-3 rounded-xl border text-center transition ${pet === p.id ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"}`}
                  >
                    <div className="text-4xl">{p.emoji}</div>
                    <div className="font-bold text-sm mt-1">{p.name}</div>
                    <div className="text-[10px] text-fg-muted mt-0.5">{p.voice}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-2xl font-bold mb-1">準備好了 🎉</h2>
              <p className="text-sm text-fg-muted mb-5">
                依你的選擇、雪鑰推薦從這一章開始：
              </p>
              <div className="rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/10 to-accent-2/5 p-5 text-center">
                <div className="text-5xl mb-2">{CAREERS.find((c) => c.id === career)?.emoji ?? "🚀"}</div>
                <div className="text-xs text-fg-muted">推薦起點</div>
                <div className="text-lg font-bold mt-1">
                  Ch{String(CAREERS.find((c) => c.id === career)?.starting ?? 1).padStart(2, "0")}
                </div>
                <div className="text-xs text-fg-muted mt-3 leading-relaxed">
                  選完按「開始學習」會帶你過去。<br />
                  寵物 <b>{PETS.find((p) => p.id === pet)?.name}</b> 已綁定、右下角會找你。
                </div>
              </div>
            </>
          )}

          {/* footer */}
          <div className="mt-6 flex items-center gap-2">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="text-xs text-fg-muted hover:text-fg inline-flex items-center gap-1">
                <ArrowLeft size={12} /> 上一步
              </button>
            )}
            <button onClick={() => finish(true)} className="text-xs text-fg-muted hover:text-fg ml-auto">
              先跳過
            </button>
            {step < 2 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={(step === 0 && !career) || (step === 1 && !pet)}
                className="text-sm px-4 py-2 rounded-full bg-gradient-to-r from-accent to-accent-2 text-black font-bold inline-flex items-center gap-1 disabled:opacity-30"
              >
                下一步 <ArrowRight size={12} />
              </button>
            ) : (
              <button
                onClick={() => finish(false)}
                disabled={saving}
                className="text-sm px-4 py-2 rounded-full bg-gradient-to-r from-accent to-accent-2 text-black font-bold inline-flex items-center gap-1 disabled:opacity-50"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                開始學習
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
