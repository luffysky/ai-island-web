"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getSpecies, type SpeciesId } from "@/lib/pet-species";
import { PetChatPanel } from "./PetChatPanel";

type PetState = {
  name: string;
  species: SpeciesId;
  mood: string;
  walk_enabled: boolean;
  proactive_enabled: boolean;
};

type Pos = { x: number; y: number };

const AUTO_MSG_CAP = 3; // 每 session 最多 3 條主動訊息
const TICK_INTERVAL_MS = 60_000;

export function Pet() {
  const { status, user } = useAuth();
  const pathname = usePathname() || "/";

  const [pet, setPet] = useState<PetState | null>(null);
  const [pos, setPos] = useState<Pos>({ x: 200, y: 400 });
  const [target, setTarget] = useState<Pos>({ x: 200, y: 400 });
  const [mood, setMood] = useState<string>("idle");
  const [line, setLine] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

  const dragOffset = useRef<{ dx: number; dy: number } | null>(null);
  const moodTimer = useRef<any>(null);
  const lineTimer = useRef<any>(null);
  const autoMsgCount = useRef<number>(0);
  const lastTickAt = useRef<number>(0);

  const hideRoute =
    pathname.startsWith("/admin") ||
    pathname.includes("/auth/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup");

  // 載入寵物
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

  // 初始位置
  useEffect(() => {
    if (typeof window === "undefined") return;
    const init = pickPosition();
    setPos(init);
    setTarget(init);
  }, []);

  // 走動：每 8 秒挑新目標
  useEffect(() => {
    if (!pet?.walk_enabled || hideRoute || hidden || dragging || chatOpen) return;
    const tick = () => setTarget(pickPosition());
    const id = window.setInterval(tick, 8000);
    return () => window.clearInterval(id);
  }, [pet?.walk_enabled, hideRoute, hidden, dragging, chatOpen]);

  // 動畫：朝 target 移動
  useEffect(() => {
    if (typeof window === "undefined" || dragging) return;
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
  }, [target, dragging]);

  // 避開鼠標：cursor 接近 → 跑開
  useEffect(() => {
    if (!pet?.walk_enabled || dragging || chatOpen) return;
    const onMove = (e: MouseEvent) => {
      const dx = pos.x - e.clientX;
      const dy = pos.y - e.clientY;
      const dist = Math.hypot(dx, dy);
      if (dist < 80) {
        // 往遠離 cursor 方向跑
        const angle = Math.atan2(dy, dx);
        const fleeDistance = 200;
        const nx = pos.x + Math.cos(angle) * fleeDistance;
        const ny = pos.y + Math.sin(angle) * fleeDistance;
        setTarget(clampToViewport({ x: nx, y: ny }));
      }
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [pet?.walk_enabled, pos.x, pos.y, dragging, chatOpen]);

  // 監聽事件 → mood
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

    const onLesson = () => setTempMood("cheering", 2500, randomLine("cheer", pet.species));
    const onXp = (e: any) => {
      const xp = e?.detail?.xp ?? 0;
      if (xp >= 50) setTempMood("proud", 3000, `+${xp} XP！`);
      else setTempMood("happy", 2000, `+${xp} XP！`);
    };
    const onLevelUp = (e: any) =>
      setTempMood("proud", 4000, `升 Lv ${e?.detail?.level ?? "??"}！`);
    const onQuizFail = () =>
      setTempMood("concerned", 3500, randomLine("comfort", pet.species));
    const onStreakBroken = () =>
      setTempMood("sad", 5000, randomLine("sad", pet.species));
    const onBookmark = () =>
      setTempMood("curious", 1500, "標起來囉～");
    const onNote = () =>
      setTempMood("happy", 1800, "好認真！");

    window.addEventListener("pet:lesson-complete", onLesson);
    window.addEventListener("pet:xp-earned", onXp);
    window.addEventListener("pet:level-up", onLevelUp);
    window.addEventListener("pet:quiz-failed", onQuizFail);
    window.addEventListener("pet:streak-broken", onStreakBroken);
    window.addEventListener("pet:bookmark-added", onBookmark);
    window.addEventListener("pet:note-saved", onNote);
    return () => {
      window.removeEventListener("pet:lesson-complete", onLesson);
      window.removeEventListener("pet:xp-earned", onXp);
      window.removeEventListener("pet:level-up", onLevelUp);
      window.removeEventListener("pet:quiz-failed", onQuizFail);
      window.removeEventListener("pet:streak-broken", onStreakBroken);
      window.removeEventListener("pet:bookmark-added", onBookmark);
      window.removeEventListener("pet:note-saved", onNote);
    };
  }, [pet]);

  // 路徑變動 → curious
  useEffect(() => {
    if (!pet) return;
    setMood("curious");
    if (moodTimer.current) clearTimeout(moodTimer.current);
    moodTimer.current = setTimeout(() => setMood("idle"), 1200);
  }, [pathname, pet]);

  // 心跳：每 60s ping /api/pet/tick；可能拿到 auto message
  useEffect(() => {
    if (!pet || hideRoute || hidden || !pet.proactive_enabled) return;
    const tick = async () => {
      if (autoMsgCount.current >= AUTO_MSG_CAP) return;
      const now = Date.now();
      if (now - lastTickAt.current < TICK_INTERVAL_MS - 1000) return;
      lastTickAt.current = now;

      try {
        const res = await fetch("/api/pet/tick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: pathname }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.mood && data.mood !== mood) setMood(data.mood);
        if (data.autoMessage) {
          autoMsgCount.current += 1;
          setLine(data.autoMessage);
          if (lineTimer.current) clearTimeout(lineTimer.current);
          lineTimer.current = setTimeout(() => setLine(null), 5000);
        }
      } catch {}
    };
    // 立即跑一次 + 之後每分鐘
    tick();
    const id = window.setInterval(tick, TICK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [pet, hideRoute, hidden, pathname]);

  // 拖曳
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      if (!dragOffset.current) return;
      setPos({
        x: e.clientX + dragOffset.current.dx,
        y: e.clientY + dragOffset.current.dy,
      });
    };
    const onUp = () => {
      setDragging(false);
      setTarget(pos); // 放開後新位置成為新 target
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, pos]);

  if (!pet || hideRoute || hidden) return null;

  const species = getSpecies(pet.species);
  const moodFx = moodClass(mood);

  return (
    <>
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

        <button
          type="button"
          onMouseDown={(e) => {
            // 純單擊 vs 拖曳：先記偏移、若移動超過 5px 視為拖曳
            const startX = e.clientX;
            const startY = e.clientY;
            const offset = { dx: pos.x - e.clientX, dy: pos.y - e.clientY };
            let moved = false;
            const onMoveCheck = (ev: MouseEvent) => {
              if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > 5) {
                moved = true;
                dragOffset.current = offset;
                setDragging(true);
                window.removeEventListener("mousemove", onMoveCheck);
              }
            };
            const onUpCheck = () => {
              window.removeEventListener("mousemove", onMoveCheck);
              window.removeEventListener("mouseup", onUpCheck);
              if (!moved) {
                // 純單擊 → 開聊天
                setChatOpen(true);
              }
            };
            window.addEventListener("mousemove", onMoveCheck);
            window.addEventListener("mouseup", onUpCheck);
          }}
          style={{
            fontSize: 40,
            background: "transparent",
            border: "none",
            cursor: dragging ? "grabbing" : "grab",
            padding: 4,
            pointerEvents: "auto",
          }}
          className={moodFx}
          title={`${pet.name}（${species.name}）— 點開聊天、拖曳移位`}
          aria-label={`${pet.name} pet companion`}
        >
          {species.emoji}
        </button>

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
          @keyframes pet-shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-3px) rotate(-3deg); }
            75% { transform: translateX(3px) rotate(3deg); }
          }
          @keyframes pet-droop {
            0%, 100% { transform: translateY(2px) rotate(0deg); opacity: 0.8; }
            50% { transform: translateY(4px) rotate(0deg); opacity: 0.7; }
          }
          .mood-idle { animation: pet-bob 3s ease-in-out infinite; }
          .mood-happy { animation: pet-bob 0.6s ease-in-out infinite; }
          .mood-cheering { animation: pet-jump 0.5s ease-in-out 4; }
          .mood-proud { animation: pet-spin 1s ease-in-out 1; }
          .mood-curious { animation: pet-tilt 0.8s ease-in-out 1; }
          .mood-sleepy { animation: pet-zzz 2s ease-in-out infinite; }
          .mood-concerned { animation: pet-shake 0.4s ease-in-out 3; }
          .mood-sad { animation: pet-droop 1.5s ease-in-out infinite; }
        `}</style>
      </div>

      {chatOpen && (
        <PetChatPanel
          pet={pet}
          onClose={() => setChatOpen(false)}
          onMessageSent={(text) => {
            setLine(text);
            if (lineTimer.current) clearTimeout(lineTimer.current);
            lineTimer.current = setTimeout(() => setLine(null), 6000);
          }}
        />
      )}
    </>
  );
}

function pickPosition(): Pos {
  if (typeof window === "undefined") return { x: 200, y: 400 };
  const w = window.innerWidth;
  const h = window.innerHeight;
  const xMin = 60;
  const xMax = w - 60;
  const yMin = 80;
  const yMax = h - 60;
  const x = xMin + Math.random() * (xMax - xMin);
  const y = yMin + Math.random() * (yMax - yMin);
  return { x, y };
}

function clampToViewport(p: Pos): Pos {
  if (typeof window === "undefined") return p;
  return {
    x: Math.max(60, Math.min(window.innerWidth - 60, p.x)),
    y: Math.max(80, Math.min(window.innerHeight - 60, p.y)),
  };
}

function moodClass(mood: string): string {
  switch (mood) {
    case "happy": return "mood-happy";
    case "cheering": return "mood-cheering";
    case "proud": return "mood-proud";
    case "curious": return "mood-curious";
    case "sleepy": return "mood-sleepy";
    case "concerned": return "mood-concerned";
    case "sad": return "mood-sad";
    default: return "mood-idle";
  }
}

const LINES: Record<string, Record<string, string[]>> = {
  cheer: {
    hamster: ["太棒！囤！", "做到了！", "厲害咻！"],
    cat: ["不錯。", "...呼。", "嗯、可以。"],
    dog: ["太棒了！！", "WOOOF！", "你最強！"],
    rabbit: ["跳跳！", "好棒…", "...耶！"],
  },
  comfort: {
    hamster: ["沒事再來一次咻！", "囤經驗、囤經驗！", "差一點！"],
    cat: ["...再試一次。", "嗯、沒關係。", "別在意。"],
    dog: ["不要哭！再來！", "你可以的！汪！", "我陪你！"],
    rabbit: ["啃啃...沒事的", "下次會更好…", "...再來。"],
  },
  sad: {
    hamster: ["連勝斷了QQ", "...再從頭咻", "明天回來繼續！"],
    cat: ["...斷了。", "...沒辦法。", "..."],
    dog: ["嗚...連勝...", "..沒關係、再衝！", "汪嗚..."],
    rabbit: ["...斷了。", "蹲下來休息一下。", "..."],
  },
};

function randomLine(kind: "cheer" | "comfort" | "sad", speciesId: string): string {
  const pool = LINES[kind][speciesId] ?? LINES[kind].hamster;
  return pool[Math.floor(Math.random() * pool.length)];
}
