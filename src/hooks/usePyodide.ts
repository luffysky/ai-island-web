"use client";

import { useEffect, useState, useCallback, useRef } from "react";

const WORKER_URL = "/pyodide-worker.js";

declare global {
  interface Window {
    __pyodideWorker?: Worker;
    __pyodideWorkerInitPromise?: Promise<void>;
    __pyodideWorkerReady?: boolean;
  }
}

export type PyodideStatus = "idle" | "loading" | "ready" | "error";

export type RunResult = {
  stdout: string;
  stderr: string;
  result: string | null;
  ok: boolean;
  truncated?: boolean;
  images: string[];  // matplotlib PNG base64 list、用 print(f"__IMAGE__{b64}") 觸發
};

export type LoadPhase = {
  id: string;
  name: string;
  weight: number;
  estSecondsFirst: number;
};

const LOAD_PHASES: LoadPhase[] = [
  { id: "script",   name: "下載 pyodide.js",                weight: 2, estSecondsFirst: 3 },
  { id: "vm",       name: "啟動 Python VM",                 weight: 2, estSecondsFirst: 2 },
  { id: "micropip", name: "預載 micropip + helpers",        weight: 1, estSecondsFirst: 1 },
  { id: "core",     name: "預載 numpy / pandas",            weight: 4, estSecondsFirst: 6 },
  { id: "viz",      name: "預載 matplotlib",                weight: 4, estSecondsFirst: 6 },
  { id: "scrape",   name: "預載 lxml / bs4 / regex / pillow", weight: 3, estSecondsFirst: 5 },
  { id: "ml",       name: "預載 scikit-learn / scipy",      weight: 5, estSecondsFirst: 10 },
  { id: "web",      name: "預載 fastapi / flask / httpx",   weight: 5, estSecondsFirst: 12 },
];
const TOTAL_WEIGHT = LOAD_PHASES.reduce((s, p) => s + p.weight, 0);
const TOTAL_EST_FIRST = LOAD_PHASES.reduce((s, p) => s + p.estSecondsFirst, 0);

type PendingRequest = {
  resolve: (v: any) => void;
  reject: (e: any) => void;
  stdout: string;
  stderr: string;
  images: string[];
  onStdout?: (s: string) => void;
  onImage?: (b64: string) => void;
};

const pendingRequests = new Map<string, PendingRequest>();

type ProgressCallback = (phaseIdx: number, phaseName: string) => void;
const progressListeners = new Set<ProgressCallback>();

function ensureWorker(): Worker {
  if (typeof window === "undefined") throw new Error("worker only in browser");
  if (window.__pyodideWorker) return window.__pyodideWorker;
  const w = new Worker(WORKER_URL);
  w.onmessage = (e) => {
    const { id, type, ready, ...rest } = e.data || {};
    if (ready) return;
    if (!id) return;

    if (type === "progress") {
      for (const cb of progressListeners) {
        try { cb(rest.phaseIdx, rest.phaseName); } catch {}
      }
      return;
    }

    const req = pendingRequests.get(id);
    if (!req) return;

    if (type === "chunk") {
      if (rest.kind === "stdout") {
        req.stdout += rest.text + "\n";
        req.onStdout?.(rest.text);
      } else if (rest.kind === "image") {
        req.images.push(rest.b64);
        req.onImage?.(rest.b64);
      } else {
        req.stderr += rest.text + "\n";
      }
      return;
    }

    if (type === "done") {
      pendingRequests.delete(id);
      req.resolve({
        stdout: rest.stdout ?? req.stdout,
        stderr: rest.stderr ?? req.stderr,
        result: rest.result ?? null,
        ok: rest.ok ?? false,
        images: rest.images ?? req.images,
      });
      return;
    }

    // init / reset reply
    pendingRequests.delete(id);
    if (rest.ok) req.resolve(rest);
    else req.reject(new Error(rest.error || "worker error"));
  };
  w.onerror = (e) => console.error("[pyodide-worker]", e);
  window.__pyodideWorker = w;
  return w;
}

function sendToWorker(
  type: string,
  payload?: any,
  callbacks?: { onStdout?: (s: string) => void; onImage?: (b64: string) => void },
): Promise<any> {
  const w = ensureWorker();
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    pendingRequests.set(id, {
      resolve, reject,
      stdout: "", stderr: "", images: [],
      onStdout: callbacks?.onStdout,
      onImage: callbacks?.onImage,
    });
    w.postMessage({ id, type, payload });
  });
}

export function usePyodide(autoLoad = false) {
  const [status, setStatus] = useState<PyodideStatus>(
    typeof window !== "undefined" && window.__pyodideWorkerReady ? "ready" : "idle",
  );
  const [progress, setProgress] = useState<string>("");
  const [phaseIdx, setPhaseIdx] = useState(-1);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const startTimeRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);

  const startTimer = useCallback(() => {
    if (tickRef.current) return;
    startTimeRef.current = Date.now();
    tickRef.current = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 250);
  }, []);

  const stopTimer = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  useEffect(() => {
    const cb: ProgressCallback = (idx, name) => {
      setPhaseIdx(idx);
      setProgress(name);
    };
    progressListeners.add(cb);
    return () => { progressListeners.delete(cb); };
  }, []);

  const load = useCallback(async () => {
    if (typeof window === "undefined") return null;

    if (window.__pyodideWorkerReady) {
      setStatus("ready");
      return true;
    }

    if (window.__pyodideWorkerInitPromise) {
      try {
        await window.__pyodideWorkerInitPromise;
        setStatus("ready");
        return true;
      } catch (e: any) {
        setStatus("error");
        setError(e?.message);
        return false;
      }
    }

    setStatus("loading");
    setError(null);
    setPhaseIdx(0);
    startTimer();

    const initPromise = sendToWorker("init")
      .then(() => {
        window.__pyodideWorkerReady = true;
        setStatus("ready");
        setProgress("");
        stopTimer();
      })
      .catch((e: any) => {
        setStatus("error");
        setError(e?.message ?? "init failed");
        stopTimer();
        throw e;
      });

    window.__pyodideWorkerInitPromise = initPromise;
    try {
      await initPromise;
      return true;
    } catch {
      return false;
    }
  }, [startTimer, stopTimer]);

  useEffect(() => {
    if (autoLoad && status === "idle") load();
  }, [autoLoad, status, load]);

  const run = useCallback(
    async (
      code: string,
      callbacks?: { onStdout?: (chunk: string) => void; onImage?: (b64: string) => void },
      stdin?: string,
    ): Promise<RunResult> => {
      if (!window.__pyodideWorkerReady) {
        const ok = await load();
        if (!ok) return { stdout: "", stderr: error ?? "Pyodide 沒載入成功", result: null, ok: false, images: [] };
      }
      try {
        const r = await sendToWorker("run", { code, stdin }, callbacks);
        return {
          stdout: r.stdout ?? "",
          stderr: r.stderr ?? "",
          result: r.result ?? null,
          ok: !!r.ok,
          images: r.images ?? [],
        };
      } catch (e: any) {
        return { stdout: "", stderr: e?.message ?? "worker run failed", result: null, ok: false, images: [] };
      }
    },
    [load, error],
  );

  const reset = useCallback(async () => {
    if (!window.__pyodideWorkerReady) return;
    await sendToWorker("reset");
  }, []);

  const progressPct = phaseIdx < 0 ? 0 :
    Math.min(99, Math.round(
      (LOAD_PHASES.slice(0, phaseIdx + 1).reduce((s, p) => s + p.weight, 0) / TOTAL_WEIGHT) * 100
    ));
  const estTotalSec = TOTAL_EST_FIRST;
  const estRemainSec = Math.max(0, estTotalSec - elapsedSec);

  return {
    status, progress, error, load, run, reset,
    phaseIdx, phaseTotal: LOAD_PHASES.length,
    phaseName: phaseIdx >= 0 ? LOAD_PHASES[phaseIdx].name : "",
    progressPct,
    elapsedSec,
    estTotalSec,
    estRemainSec,
  };
}
