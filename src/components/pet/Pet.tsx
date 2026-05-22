"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getSpecies, type SpeciesId } from "@/lib/pet-species";

type PetState = {
  name: string;
  species: SpeciesId;
  mood: string;
  walk_enabled: boolean;
  proactive_enabled: boolean;
};

type Pos = { x: number; y: number };

/**
 * 浮動寵物 PR 1：
 *   - mount 後 GET /api/pet/load 取狀態（user 沒登入就不顯示）
 *   - 預設在底部慢慢走動、避開 admin toolbar (左下) 與 AI tutor (右下) 與頁首
 *   - 點寵物 → 顯示一個小泡泡（PR 1 還沒接 AI、給預寫台詞）
 *   - mood 反應 lesson-complete / xp-earned event
 *
 * PR 2 才加 AI 對話、PR 3 才加心跳主動訊息。
 */
export function Pet() {
  const { status, user } = useAuth();
  const pathname = usePathname() || "/";

  const [pet, setPet] = useState<PetState | null>(null);
  const [pos, setPos] = useState<Pos>({ x: 200, y: 400 });
  const [target, setTarget] = useState<Pos>({ x: 200, y: 400 });
  const [mood, setMood] = useState<string>("idle");
  const [line, setLine] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const moodTimer = useRef<any>(null);
  const lineTimer = useRef<any>(null);

  // 不在 admin / login / callback 顯示
  const hideRoute =
    pathname.startsWith("/admin") ||
    pathname.includes("/auth/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup");

  // 載入寵物（只有登入）
  useEffect(() => {
    if (status !== "in") {
      setPet(null);
      return;
    }
    fetch("/api/pet/load")
      .then((r) => r.json())
      .then((j) => {
        if (j.pet) setPet(j.pet);
      })
      .catch(() => {});
  }, [status, user?.id]);

  // 初始位置 → viewport 中右下
  useEffect(() => {
    if (typeof window === "undefined") return;
    const init = pickPosition();
    setPos(init);
    setTarget(init);
  }, []);

  // 走動：每 8 秒挑新目標
  useEffect(() => {
    if (!pet?.walk_enabled || hideRoute || hidden) return;
    const tick = () => {
      setTarget(pickPosition());
    };
    const id = window.setInterval(tick, 8000);
    return () => window.clearInterval(id);
  }, [pet?.walk_enabled, hideRoute, hidden]);

  // 動畫：每幀朝 target 移動
  useEffect(() => {
    if (typeof window === "undefined") return;
    let frame = 0;
    const animate = () => {
      setPos((p) => {
        const dx = target.x - p.x;
        const dy = target.y - p.y;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return p;
        return { x: p.x + dx * 0.012, y: p.y + dy * 0.012 };
      });
      frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [target]);

  // 監聽全域事件 → mood
  useEffect(() => {
    if (!pet) return;
    const setTempMood = (m: string, duration: number, lineText?: string) => {
      setMood(m);
      if (lineText) {
        setLine(lineText);
        if (lineTimer.current) clearTimeout(lineTimer.current);
        lineTimer.current = setTimeout(() => setLine(null), duration);
      }
      if (moodTimer.current) clearTimeout(moodTimer.current);
      moodTimer.current = setTimeout(() => setMood("idle"), duration);
    };

    const onLesson = () => setTempMood("cheering", 2500, randomLine("cheer"));
    const onXp = (e: any) => {
      const xp = e?.detail?.xp ?? 0;
      if (xp >= 50) setTempMood("proud", 3000, `+${xp} XP！太強！`);
      else setTempMood("happy", 2000, `+${xp} XP！`);
    };
    const onLevelUp = (e: any) =>
      setTempMood("proud", 4000, `升 Lv ${e?.detail?.level ?? "??"}！`);

    window.addEventListener("pet:lesson-complete", onLesson);
    window.addEventListener("pet:xp-earned", onXp);
    window.addEventListener("pet:level-up", onLevelUp);
    return () => {
      window.removeEventListener("pet:lesson-complete", onLesson);
      window.removeEventListener("pet:xp-earned", onXp);
      window.removeEventListener("pet:level-up", onLevelUp);
    };
  }, [pet]);

  // pathname change → curious 一下
  useEffect(() => {
    if (!pet) return;
    setMood("curious");
    if (moodTimer.current) clearTimeout(moodTimer.current);
    moodTimer.current = setTimeout(() => setMood("idle"), 1200);
  }, [pathname, pet]);

  if (!pet || hideRoute || hidden) return null;

  const species = getSpecies(pet.species);
  const moodFx = moodClass(mood);

  return (
    <div
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        zIndex: 35,
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      {/* 對話泡泡 */}
      {line && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: "115%",
            transform: "translateX(-50%)",
            background: "var(--color-bg-card)",
            border: "1px solid var(--color-border)",
            borderRadius: 10,
            padding: "4px 10px",
            fontSize: 12,
            whiteSpace: "nowrap",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          {line}
        </div>
      )}

      {/* 寵物本體 */}
      <button
        type="button"
        onClick={() => {
          const greeting = randomLine("greet", species.name);
          setLine(greeting);
          if (lineTimer.current) clearTimeout(lineTimer.current);
          lineTimer.current = setTimeout(() => setLine(null), 2500);
        }}
        style={{
          fontSize: 40,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 4,
          pointerEvents: "auto",
        }}
        className={moodFx}
        title={`${pet.name}（${species.name}）— 點我打招呼`}
        aria-label={`${pet.name} pet companion`}
      >
        {species.emoji}
      </button>

      {/* 隱藏按鈕：小×、靠泡泡上方 */}
      <button
        onClick={() => setHidden(true)}
        style={{
          position: "absolute",
          left: "100%",
          top: 0,
          background: "transparent",
          border: "none",
          color: "var(--color-fg-muted)",
          fontSize: 10,
          cursor: "pointer",
          pointerEvents: "auto",
          padding: "2px 4px",
        }}
        title="本次瀏覽隱藏"
      >
        ✕
      </button>

      <style jsx>{`
        @keyframes pet-bob {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-4px) rotate(2deg); }
        }
        @keyframes pet-jump {
          0%, 100% { transform: translateY(0); }
          30% { transform: translateY(-14px) scale(1.1); }
          60% { transform: translateY(0) scale(1); }
        }
        @keyframes pet-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pet-tilt {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-15deg); }
        }
        @keyframes pet-zzz {
          0%, 100% { opacity: 0.6; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1); }
        }
        .mood-idle { animation: pet-bob 3s ease-in-out infinite; }
        .mood-happy { animation: pet-bob 0.6s ease-in-out infinite; }
        .mood-cheering { animation: pet-jump 0.5s ease-in-out 4; }
        .mood-proud { animation: pet-spin 1s ease-in-out 1; }
        .mood-curious { animation: pet-tilt 0.8s ease-in-out 1; }
        .mood-sleepy { animation: pet-zzz 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

function pickPosition(): Pos {
  if (typeof window === "undefined") return { x: 200, y: 400 };
  const w = window.innerWidth;
  const h = window.innerHeight;
  // 避開 admin toolbar (左下 ~ 220×80) + AI tutor (右下 ~ 100×100) + topnav (h 56)
  const xMin = 60;
  const xMax = w - 60;
  const yMin = 80;
  const yMax = h - 60;
  // 隨機 + 30% 機會待在上 60% 區域避免常擋在底部
  const x = xMin + Math.random() * (xMax - xMin);
  const y = yMin + Math.random() * (yMax - yMin);
  return { x, y };
}

function moodClass(mood: string): string {
  switch (mood) {
    case "happy": return "mood-happy";
    case "cheering": return "mood-cheering";
    case "proud": return "mood-proud";
    case "curious": return "mood-curious";
    case "sleepy": return "mood-sleepy";
    default: return "mood-idle";
  }
}

const LINES = {
  greet: {
    倉鼠: ["咻！你回來啦！", "我在這！", "嗨～", "今天學什麼？囤起來囤起來"],
    貓: ["...喵。", "你回來了。", "...坐下吧。", "別吵我我在思考。"],
    狗: ["汪！你來了！！", "好久不見！！", "陪我玩！", "今天超棒！"],
    兔子: ["跳跳～", "你來了…", "啃啃。", "...嗨。"],
  } as Record<string, string[]>,
  cheer: {
    倉鼠: ["太棒！囤！", "做到了！", "厲害！"],
    貓: ["不錯。", "...呼。", "嗯、可以。"],
    狗: ["太棒了！！！", "WOOOF！", "你最強！"],
    兔子: ["跳跳！", "好棒…", "...耶！"],
  } as Record<string, string[]>,
};

function randomLine(kind: "greet" | "cheer", speciesName?: string): string {
  const key = (speciesName ?? "倉鼠") as keyof (typeof LINES.greet);
  const pool = LINES[kind][key] ?? LINES[kind]["倉鼠"];
  return pool[Math.floor(Math.random() * pool.length)];
}
