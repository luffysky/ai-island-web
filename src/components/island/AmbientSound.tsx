"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { isSoundOn, setSoundOn, subscribeCollect, subscribeOpen, subscribeNpc, RESOURCE_META, type ResourceKind } from "./island-bus";

/**
 * 環境音效 — 完全用 Web Audio API 程式合成、沒有 asset 檔。
 * - 開場 user 互動後 lazy 建 AudioContext（瀏覽器需 gesture）
 * - 環境風聲：低頻白噪音 + 慢 LFO
 * - 採集音：依資源類型不同 envelope（樹 = 低 chop、水晶 = 高 ding、貝殼 = 海浪 swoosh）
 * - 開 modal / NPC：翻紙 click
 * - 右上小喇叭 chip 切換靜音、寫 localStorage 記憶
 */
export function AmbientSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);
  const sfxGainRef = useRef<GainNode | null>(null);
  const [on, setOn] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // 讀取靜音狀態
  useEffect(() => { setOn(isSoundOn()); }, []);

  // user 第一次互動才能建 AudioContext
  useEffect(() => {
    const init = () => {
      if (ctxRef.current) return;
      try {
        const C = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!C) return;
        const ctx: AudioContext = new C();
        ctxRef.current = ctx;
        // 環境風聲：白噪音 → 低通 → gain
        const noise = ctx.createBufferSource();
        const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
        noise.buffer = buf;
        noise.loop = true;
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 480;
        const ambient = ctx.createGain();
        ambient.gain.value = on ? 0.08 : 0;
        // LFO 讓風聲時大時小
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.13;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.03;
        lfo.connect(lfoGain).connect(ambient.gain);
        noise.connect(lp).connect(ambient).connect(ctx.destination);
        noise.start();
        lfo.start();
        ambientGainRef.current = ambient;

        const sfx = ctx.createGain();
        sfx.gain.value = on ? 0.5 : 0;
        sfx.connect(ctx.destination);
        sfxGainRef.current = sfx;

        setInitialized(true);
      } catch (e) {
        // AudioContext init 失敗（如 Safari iOS、舊瀏覽器）— 忽略
      }
    };
    const handler = () => { init(); };
    window.addEventListener("pointerdown", handler, { once: true });
    window.addEventListener("keydown", handler, { once: true });
    window.addEventListener("touchstart", handler, { once: true });
    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
      window.removeEventListener("touchstart", handler);
    };
  }, []);

  // 音量切換
  useEffect(() => {
    if (ambientGainRef.current) ambientGainRef.current.gain.value = on ? 0.08 : 0;
    if (sfxGainRef.current) sfxGainRef.current.gain.value = on ? 0.5 : 0;
  }, [on]);

  // 採集音效
  useEffect(() => {
    return subscribeCollect((e) => {
      playHarvest(ctxRef.current, sfxGainRef.current, e.kind);
    });
  }, []);

  // 開 modal 音效（節點 / NPC）
  useEffect(() => {
    const a = subscribeOpen(() => playClick(ctxRef.current, sfxGainRef.current, 880));
    const b = subscribeNpc(() => playClick(ctxRef.current, sfxGainRef.current, 660));
    return () => { a(); b(); };
  }, []);

  const toggle = () => {
    const next = !on;
    setOn(next);
    setSoundOn(next);
  };

  return (
    <button
      onClick={toggle}
      title={on ? "靜音" : "開聲音"}
      className="absolute top-3 right-44 z-30 pointer-events-auto w-9 h-9 rounded-full bg-black/60 backdrop-blur text-white flex items-center justify-center hover:bg-black/80"
    >
      {on ? <Volume2 size={14} /> : <VolumeX size={14} className="text-fg-muted" />}
      {!initialized && on && (
        <span className="absolute -bottom-5 right-0 text-[9px] text-yellow-300 whitespace-nowrap">點任意處啟動</span>
      )}
    </button>
  );
}

function playHarvest(ctx: AudioContext | null, dest: GainNode | null, kind: ResourceKind) {
  if (!ctx || !dest) return;
  const now = ctx.currentTime;
  if (kind === "wood") {
    // 低頻 chop chop
    for (let i = 0; i < 2; i++) {
      const t = now + i * 0.08;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(70, t + 0.08);
      g.gain.setValueAtTime(0.6, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      osc.connect(g).connect(dest);
      osc.start(t);
      osc.stop(t + 0.12);
    }
  } else if (kind === "crystal") {
    // 高頻 ding（兩個泛音）
    [1320, 1980].forEach((f, i) => {
      const t = now + i * 0.02;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      osc.connect(g).connect(dest);
      osc.start(t);
      osc.stop(t + 0.75);
    });
  } else {
    // shell：短 swoosh（過濾白噪音）
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(800, now);
    bp.frequency.exponentialRampToValueAtTime(2000, now + 0.3);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    src.connect(bp).connect(g).connect(dest);
    src.start(now);
    src.stop(now + 0.42);
  }
}

function playClick(ctx: AudioContext | null, dest: GainNode | null, freq: number) {
  if (!ctx || !dest) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.3, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(g).connect(dest);
  osc.start(now);
  osc.stop(now + 0.18);
}
