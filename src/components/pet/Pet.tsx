"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useOverlayCount } from "@/lib/overlay-stack";
import { getSpecies, type SpeciesId } from "@/lib/pet-species";
import { getVipTier, pickHonorific, usesCuteBubble, hasVipAura } from "@/lib/pet-vip";
import {
  pickChatter,
  pathToPageKind,
  timeKind,
  type ChatterCtx,
  type ChatterKind,
} from "@/lib/pet-chatter";
import { getSeason, getHoliday, getHeadDecoration } from "@/lib/pet-season";
import { PlainBubble, CuteBubble } from "./PetBubble";
import { PetChatPanel } from "./PetChatPanel";

type PetState = {
  name: string;
  species: SpeciesId;
  mood: string;
  walk_enabled: boolean;
  proactive_enabled: boolean;
};

type Pos = { x: number; y: number };

const AUTO_MSG_CAP = 3;
const TICK_INTERVAL_MS = 60_000;
const LINE_DURATION_MS = 4500;
const MOBILE_BREAKPOINT = 768; // < 768px 視為手機
const MOBILE_SCALE = 0.7;

export function Pet() {
  const { status, user, profile } = useAuth();
  const pathname = usePathname() || "/";
  const overlayCount = useOverlayCount();

  const [pet, setPet] = useState<PetState | null>(null);
  const [pos, setPos] = useState<Pos>({ x: 200, y: 400 });
  const [target, setTarget] = useState<Pos>({ x: 200, y: 400 });
  const [isMobile, setIsMobile] = useState(false);
  const [mood, setMood] = useState<string>("idle");
  const [line, setLine] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [userMoved, setUserMoved] = useState(false); // 用戶拖過後、不再強制右下角
  const [milestoneBurst, setMilestoneBurst] = useState<30 | 60 | 100 | null>(null);

  const dragOffset = useRef<{ dx: number; dy: number } | null>(null);
  const moodTimer = useRef<any>(null);
  const lineTimer = useRef<any>(null);
  const autoMsgCount = useRef<number>(0);
  const lastTickAt = useRef<number>(0);
  const lastActiveAt = useRef<number>(Date.now());
  const sessionGreetedRef = useRef<boolean>(false);
  const recentChatterRef = useRef<Set<string>>(new Set());
  const holidayGreetedRef = useRef<string | null>(null);
  const burstTimerRef = useRef<any>(null);

  const vipTier = getVipTier(profile);
  const cuteMode = usesCuteBubble(vipTier);
  const auraOn = hasVipAura(vipTier);

  const hideRoute =
    pathname.startsWith("/admin") ||
    pathname.includes("/auth/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup");

  // 載寵物
  useEffect(() => {
    if (status !== "in") {
      setPet(null);
      sessionGreetedRef.current = false;
      autoMsgCount.current = 0;
      return;
    }
    fetch("/api/pet/load")
      .then((r) => r.json())
      .then((j) => {
        if (j.pet) setPet(j.pet);
      })
      .catch(() => {});
  }, [status, user?.id]);

  // 建 ChatterCtx（每次 pet/profile/pathname 變動重建）
  const ctx: ChatterCtx | null = useMemo(() => {
    if (!pet || !profile) return null;
    return {
      species: pet.species,
      vip: vipTier,
      hour: new Date().getHours(),
      recent: recentChatterRef.current,
      honorific: pickHonorific(vipTier, profile.display_name),
      level: profile.level ?? 1,
      xp: profile.xp ?? 0,
      streak: profile.streak_days ?? 0,
      petName: pet.name,
    };
  }, [pet, profile, vipTier]);

  // 安全 say：尊重「正在說話」、避免覆蓋未播完的事件台詞（除非 force）
  const say = (text: string | null, opts?: { force?: boolean; mood?: string; duration?: number }) => {
    if (!text) return;
    if (line && !opts?.force) return;
    setLine(text);
    if (lineTimer.current) clearTimeout(lineTimer.current);
    lineTimer.current = setTimeout(() => setLine(null), opts?.duration ?? LINE_DURATION_MS);
    if (opts?.mood) {
      setMood(opts.mood);
      if (moodTimer.current) clearTimeout(moodTimer.current);
      moodTimer.current = setTimeout(() => setMood("idle"), (opts.duration ?? LINE_DURATION_MS) - 500);
    }
  };

  // 隨機抽 chatter（kind → say）
  const fire = (kind: ChatterKind, extra?: Record<string, string | number>, opts?: { force?: boolean; mood?: string }) => {
    if (!ctx) return;
    const text = pickChatter(kind, ctx, extra);
    if (text) say(text, opts);
  };

  // 偵測手機
  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // 初始位置（手機放右下角安全區、不擋閱讀）
  useEffect(() => {
    if (typeof window === "undefined") return;
    const init = isMobile ? pickMobileCorner() : pickPosition();
    setPos(init);
    setTarget(init);
  }, [isMobile]);

  // session greet（一次性、登入後 1.5s 觸發）
  useEffect(() => {
    if (!pet || !ctx || sessionGreetedRef.current || hideRoute) return;
    sessionGreetedRef.current = true;
    const t = setTimeout(() => {
      // VIP 用 vip-greet、其他用 session-greet
      if (vipTier === "luffy" || vipTier === "nami") {
        fire("vip-greet", undefined, { force: true });
      } else {
        fire("session-greet", undefined, { force: true });
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [pet, ctx, hideRoute, vipTier]);

  // 走動（手機停在角落、不亂跑、避免覆蓋學員閱讀區）
  useEffect(() => {
    if (!pet?.walk_enabled || hideRoute || hidden || dragging || chatOpen || isMobile) return;
    const tick = () => setTarget(pickPosition());
    const id = window.setInterval(tick, 8000);
    return () => window.clearInterval(id);
  }, [pet?.walk_enabled, hideRoute, hidden, dragging, chatOpen, isMobile]);

  // 動畫
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

  // 避開鼠標（手機沒鼠標、關閉）
  useEffect(() => {
    if (!pet?.walk_enabled || dragging || chatOpen || isMobile) return;
    const onMove = (e: MouseEvent) => {
      const dx = pos.x - e.clientX;
      const dy = pos.y - e.clientY;
      const dist = Math.hypot(dx, dy);
      if (dist < 80) {
        const angle = Math.atan2(dy, dx);
        const fleeDistance = 200;
        const nx = pos.x + Math.cos(angle) * fleeDistance;
        const ny = pos.y + Math.sin(angle) * fleeDistance;
        setTarget(clampToViewport({ x: nx, y: ny }));
      }
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [pet?.walk_enabled, pos.x, pos.y, dragging, chatOpen, isMobile]);

  // ---------- 事件監聽 ----------
  useEffect(() => {
    if (!pet || !ctx) return;

    const onLesson = () => fire("lesson-complete", undefined, { force: true, mood: "cheering" });
    const onXp = (e: any) => {
      const xp = e?.detail?.xp ?? 0;
      const kind: ChatterKind = xp >= 100 ? "xp-big" : xp >= 30 ? "xp-medium" : "xp-small";
      fire(kind, { xp }, { force: true, mood: xp >= 50 ? "proud" : "happy" });
    };
    const onLevelUp = (e: any) => {
      const level = e?.detail?.level ?? 1;
      fire("level-up", { level }, { force: true, mood: "proud" });
    };
    const onQuizPerfect = () => fire("quiz-perfect", undefined, { force: true, mood: "proud" });
    const onQuizFail = () => fire("quiz-fail", undefined, { force: true, mood: "concerned" });
    const onQuizPass = () => fire("quiz-pass", undefined, { force: true, mood: "happy" });
    const onStreakBroken = () => fire("streak-broken", undefined, { force: true, mood: "sad" });
    const onBookmark = () => fire("bookmark-added", undefined, { force: true });
    const onNote = () => fire("note-saved", undefined, { force: true });
    const onTodoDone = () => fire("todo-completed", undefined, { force: true, mood: "happy" });
    const onMilestone = (e: any) => {
      const count = e?.detail?.count;
      if (count !== 30 && count !== 60 && count !== 100) return;
      const kind = `milestone-${count}` as ChatterKind;
      fire(kind, undefined, { force: true, mood: "proud" });
      setMilestoneBurst(count);
      if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
      burstTimerRef.current = setTimeout(() => setMilestoneBurst(null), 4500);
    };

    window.addEventListener("pet:lesson-complete", onLesson);
    window.addEventListener("pet:xp-earned", onXp);
    window.addEventListener("pet:level-up", onLevelUp);
    window.addEventListener("pet:quiz-perfect", onQuizPerfect);
    window.addEventListener("pet:quiz-failed", onQuizFail);
    window.addEventListener("pet:quiz-passed", onQuizPass);
    window.addEventListener("pet:streak-broken", onStreakBroken);
    window.addEventListener("pet:bookmark-added", onBookmark);
    window.addEventListener("pet:note-saved", onNote);
    window.addEventListener("pet:todo-completed", onTodoDone);
    window.addEventListener("pet:milestone-reached", onMilestone);
    return () => {
      window.removeEventListener("pet:lesson-complete", onLesson);
      window.removeEventListener("pet:xp-earned", onXp);
      window.removeEventListener("pet:level-up", onLevelUp);
      window.removeEventListener("pet:quiz-perfect", onQuizPerfect);
      window.removeEventListener("pet:quiz-failed", onQuizFail);
      window.removeEventListener("pet:quiz-passed", onQuizPass);
      window.removeEventListener("pet:streak-broken", onStreakBroken);
      window.removeEventListener("pet:bookmark-added", onBookmark);
      window.removeEventListener("pet:note-saved", onNote);
      window.removeEventListener("pet:todo-completed", onTodoDone);
      window.removeEventListener("pet:milestone-reached", onMilestone);
    };
    // ctx 依賴會 trigger re-bind、但因為 listener id 不同也沒事
  }, [pet, ctx]);

  // ---------- 路徑變化 ----------
  useEffect(() => {
    if (!pet || !ctx) return;
    lastActiveAt.current = Date.now();
    setMood("curious");
    if (moodTimer.current) clearTimeout(moodTimer.current);
    moodTimer.current = setTimeout(() => setMood("idle"), 1200);

    // 35% 機率說頁面相關台詞（不要太吵）
    if (Math.random() < 0.35) {
      const kind = pathToPageKind(pathname);
      if (kind) {
        // 等 mood 動畫過再說
        setTimeout(() => fire(kind), 800);
      }
    }
  }, [pathname, pet?.name]);

  // ---------- Tab visibility ----------
  useEffect(() => {
    if (!pet || !ctx || !pet.proactive_enabled) return;
    let leftAt = 0;
    const onVisibility = () => {
      if (document.hidden) {
        leftAt = Date.now();
      } else {
        const away = Date.now() - leftAt;
        lastActiveAt.current = Date.now();
        if (away > 30_000) {
          setTimeout(() => fire("tab-return", undefined, { force: true }), 500);
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [pet, ctx]);

  // ---------- 時段 chatter（每小時打一次卡）----------
  useEffect(() => {
    if (!pet || !ctx || !pet.proactive_enabled) return;
    const t = setTimeout(() => {
      const k = timeKind();
      // 凌晨對 VIP 特別關懷
      if (k === "late-night" && (vipTier === "luffy" || vipTier === "nami") && Math.random() < 0.65) {
        fire("vip-late-night", undefined, { force: true });
      } else if (Math.random() < 0.55) {
        fire(k);
      }
    }, 6000);
    return () => clearTimeout(t);
  }, [pet?.name, ctx, vipTier]);

  // ---------- 隨機 ambient ----------
  useEffect(() => {
    if (!pet || !ctx || !pet.proactive_enabled || hideRoute) return;
    let cancelled = false;
    const streak = ctx.streak ?? 0;
    const season = getSeason();
    const seasonKind: ChatterKind = `season-${season}` as ChatterKind;
    const schedule = () => {
      const delay = 90_000 + Math.random() * 90_000; // 90-180s
      const id = window.setTimeout(() => {
        if (cancelled) return;
        // 35% 機率說話
        if (Math.random() < 0.35) {
          const pool: ChatterKind[] = [
            "ambient",
            "ambient",
            "ambient",
            "ambient-curious",
            "ambient-self-talk",
            "ambient-philosophical",
            "ambient-complain",
            seasonKind, // 季節感
          ];
          // streak boost — 長連勝偶爾打卡
          if (streak >= 100) pool.push("streak-boost-100");
          else if (streak >= 30) pool.push("streak-boost-30");
          else if (streak >= 7) pool.push("streak-boost-7");
          const kind = pool[Math.floor(Math.random() * pool.length)];
          fire(kind);
        }
        schedule();
      }, delay);
      return id;
    };
    const id = schedule();
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [pet, ctx, hideRoute]);

  // ---------- 節日 daily once ----------
  useEffect(() => {
    if (!pet || !ctx || hideRoute) return;
    const today = new Date();
    const holiday = getHoliday(today);
    if (!holiday) return;
    const key = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}-${holiday}`;
    if (holidayGreetedRef.current === key) return;
    holidayGreetedRef.current = key;
    const kind = `holiday-${holiday}` as ChatterKind;
    const t = setTimeout(() => fire(kind, undefined, { force: true, mood: "happy" }), 3000);
    return () => clearTimeout(t);
  }, [pet, ctx, hideRoute]);

  // ---------- 心跳：AI tick ----------
  useEffect(() => {
    if (!pet || hideRoute || hidden || !pet.proactive_enabled) return;
    const tick = async () => {
      if (autoMsgCount.current >= AUTO_MSG_CAP) return;
      const now = Date.now();
      if (now - lastTickAt.current < TICK_INTERVAL_MS - 1000) return;
      lastTickAt.current = now;
      try {
        const res = await fetch("/api/pet/tick", {
      credentials: "include",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: pathname }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.mood && data.mood !== mood) setMood(data.mood);
        if (data.autoMessage) {
          autoMsgCount.current += 1;
          say(data.autoMessage, { force: true, duration: 6000 });
        }
      } catch {}
    };
    tick();
    const id = window.setInterval(tick, TICK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [pet, hideRoute, hidden, pathname]);

  // ---------- 拖曳（mouse + touch） ----------
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      if (!dragOffset.current) return;
      setUserMoved(true);
      setPos({
        x: e.clientX + dragOffset.current.dx,
        y: e.clientY + dragOffset.current.dy,
      });
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!dragOffset.current) return;
      const t = e.touches[0];
      if (!t) return;
      e.preventDefault();
      setUserMoved(true);
      setPos({
        x: t.clientX + dragOffset.current.dx,
        y: t.clientY + dragOffset.current.dy,
      });
    };
    const onUp = () => {
      setDragging(false);
      setTarget(pos);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, pos]);

  if (!pet || hideRoute || hidden) return null;
  // modal 開時暫時隱藏（避免擋 dropdown / TODO）
  if (overlayCount > 0) return null;

  const species = getSpecies(pet.species);
  const moodFx = moodClass(mood);
  const Bubble = cuteMode ? CuteBubble : PlainBubble;
  const auraColor = vipTier === "nami" ? "#ff9ec0" : vipTier === "luffy" ? "#ffd700" : null;
  const headDeco = getHeadDecoration();

  // 手機：預設右下角；但用戶拖過後改用 pos x/y（讓手機也能拖到任意位置）
  const positionStyle: React.CSSProperties = isMobile && !userMoved
    ? {
        right: 16,
        bottom: "max(16px, env(safe-area-inset-bottom))",
        left: "auto",
        top: "auto",
        transform: "none",
      }
    : { left: pos.x, top: pos.y, transform: "translate(-50%, -50%)" };

  return (
    <>
      <div
        style={{
          position: "fixed",
          ...positionStyle,
          zIndex: 39,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {line && <Bubble text={line} />}

        {/* VIP aura */}
        {auraOn && auraColor && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${auraColor}55 0%, ${auraColor}22 40%, transparent 70%)`,
              filter: "blur(4px)",
              pointerEvents: "none",
            }}
            className="vip-aura"
          />
        )}

        {/* milestone burst — 30/60/100 達成時 4.5s 粒子噴發 */}
        {milestoneBurst && (
          <div
            className={`milestone-burst milestone-burst-${milestoneBurst}`}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: 120,
              height: 120,
              pointerEvents: "none",
              zIndex: 0,
            }}
          >
            {Array.from({ length: milestoneBurst === 100 ? 12 : 8 }).map((_, i) => (
              <span
                key={i}
                className="burst-particle"
                style={{
                  ["--i" as any]: i,
                  ["--total" as any]: milestoneBurst === 100 ? 12 : 8,
                }}
              >
                {milestoneBurst === 100 ? "🌈" : milestoneBurst === 60 ? "✨" : "⭐"}
              </span>
            ))}
          </div>
        )}

        <button
          type="button"
          onMouseDown={(e) => {
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
                setChatOpen(true);
              }
            };
            window.addEventListener("mousemove", onMoveCheck);
            window.addEventListener("mouseup", onUpCheck);
          }}
          onTouchStart={(e) => {
            const t = e.touches[0];
            if (!t) return;
            const startX = t.clientX;
            const startY = t.clientY;
            const offset = { dx: pos.x - t.clientX, dy: pos.y - t.clientY };
            let moved = false;
            const onTouchMoveCheck = (ev: TouchEvent) => {
              const tt = ev.touches[0];
              if (!tt) return;
              if (Math.hypot(tt.clientX - startX, tt.clientY - startY) > 8) {
                moved = true;
                dragOffset.current = offset;
                setDragging(true);
                window.removeEventListener("touchmove", onTouchMoveCheck);
              }
            };
            const onTouchEndCheck = () => {
              window.removeEventListener("touchmove", onTouchMoveCheck);
              window.removeEventListener("touchend", onTouchEndCheck);
              if (!moved) setChatOpen(true);
            };
            window.addEventListener("touchmove", onTouchMoveCheck, { passive: true });
            window.addEventListener("touchend", onTouchEndCheck);
          }}
          style={{
            fontSize: isMobile ? Math.round(40 * MOBILE_SCALE) : 40,
            background: "transparent",
            border: "none",
            cursor: dragging ? "grabbing" : "grab",
            padding: 4,
            pointerEvents: "auto",
            position: "relative",
            zIndex: 1,
            touchAction: "none",
          }}
          className={moodFx}
          title={`${pet.name}（${species.name}）— 點開聊天、拖曳移位`}
          aria-label={`${pet.name} pet companion`}
        >
          {/* 頭頂裝飾（節日/聖誕等） */}
          {headDeco && (
            <span
              style={{
                position: "absolute",
                left: "50%",
                top: -8,
                transform: "translateX(-50%) rotate(-12deg)",
                fontSize: 22,
                pointerEvents: "none",
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.25))",
              }}
              aria-hidden
            >
              {headDeco}
            </span>
          )}
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
          @keyframes vip-pulse {
            0%, 100% { opacity: 0.55; transform: translate(-50%, -50%) scale(1); }
            50% { opacity: 0.9; transform: translate(-50%, -50%) scale(1.1); }
          }
          @keyframes burst-out {
            0% {
              opacity: 0;
              transform: translate(-50%, -50%) translate(0, 0) scale(0.4);
            }
            20% {
              opacity: 1;
            }
            100% {
              opacity: 0;
              transform:
                translate(-50%, -50%)
                translate(
                  calc(cos(calc(var(--i) * 360deg / var(--total))) * 70px),
                  calc(sin(calc(var(--i) * 360deg / var(--total))) * 70px)
                )
                scale(1.3);
            }
          }
          @keyframes burst-rotate {
            from { transform: translate(-50%, -50%) rotate(0deg); }
            to   { transform: translate(-50%, -50%) rotate(360deg); }
          }
          .mood-idle { animation: pet-bob 3s ease-in-out infinite; }
          .mood-happy { animation: pet-bob 0.6s ease-in-out infinite; }
          .mood-cheering { animation: pet-jump 0.5s ease-in-out 4; }
          .mood-proud { animation: pet-spin 1s ease-in-out 1; }
          .mood-curious { animation: pet-tilt 0.8s ease-in-out 1; }
          .mood-sleepy { animation: pet-zzz 2s ease-in-out infinite; }
          .mood-concerned { animation: pet-shake 0.4s ease-in-out 3; }
          .mood-sad { animation: pet-droop 1.5s ease-in-out infinite; }
          :global(.vip-aura) { animation: vip-pulse 2.6s ease-in-out infinite; }
          :global(.milestone-burst) {
            animation: burst-rotate 4.5s linear 1;
          }
          :global(.milestone-burst .burst-particle) {
            position: absolute;
            left: 50%;
            top: 50%;
            font-size: 22px;
            animation: burst-out 1.4s ease-out infinite;
            animation-delay: calc(var(--i) * 0.06s);
          }
          :global(.milestone-burst-100 .burst-particle) {
            font-size: 28px;
            filter: drop-shadow(0 0 6px rgba(255, 215, 0, 0.8));
          }
          :global(.milestone-burst-60 .burst-particle) {
            filter: drop-shadow(0 0 4px rgba(255, 200, 100, 0.7));
          }
          :global(.milestone-burst-30 .burst-particle) {
            filter: drop-shadow(0 0 3px rgba(255, 215, 0, 0.6));
          }
        `}</style>
      </div>

      {chatOpen && (
        <PetChatPanel
          pet={pet}
          onClose={() => setChatOpen(false)}
          onMessageSent={(text) => {
            say(text, { force: true, duration: 6000 });
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

// 手機：固定放右下角安全區、避免擋閱讀內容
function pickMobileCorner(): Pos {
  if (typeof window === "undefined") return { x: 280, y: 600 };
  const w = window.innerWidth;
  const h = window.innerHeight;
  // 用 env(safe-area-inset-*) 估算（iPhone 瀏海 / 底部 home bar）
  const safeBottom = 24; // 底部留白 + safe-area
  const safeRight = 24;
  return { x: w - 36 - safeRight, y: h - 36 - safeBottom };
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
