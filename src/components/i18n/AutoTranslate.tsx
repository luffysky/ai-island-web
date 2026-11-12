"use client";

import { useEffect } from "react";

/**
 * 補翻「還寫死在程式裡的中文」。在 i18n 訊息檔和 DB 內容翻譯之後的最後一層。
 * - 簡體：OpenCC 在瀏覽器裡直接轉，不打 API。
 * - 英日韓：收集畫面上的中文，批次送 /api/i18n/ui（伺服器有共用快取），回來再換掉。
 * 只改文字節點的 nodeValue 和少數屬性，不增刪節點，React 之後重繪也不會壞；重繪回中文時會再換一次。
 * 不想被翻的區塊加 translate="no" 或 data-no-translate。
 */

const HAN = /[㐀-鿿]/;
const KANA = /[぀-ヿ]/;
const ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA", "KBD", "SAMP"]);
const SKIP_SELECTOR = '[translate="no"],[data-no-translate],.notranslate,[contenteditable="true"],.cm-editor,.monaco-editor';
const CACHE_KEY = (locale: string) => `ui-i18n:${locale}`;
const MAX_LEN = 600;

export function AutoTranslate({ locale }: { locale: string }) {
  useEffect(() => {
    if (locale === "zh") return;
    let cancelled = false;
    let observer: MutationObserver | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    // 我們自己寫回去的值：再看到同樣的值就跳過，避免無限循環
    const applied = new WeakMap<Node, string>();
    const appliedAttr = new WeakMap<Element, Map<string, string>>();

    const memory = new Map<string, string>();
    try {
      const saved = localStorage.getItem(CACHE_KEY(locale));
      if (saved) for (const [k, v] of Object.entries(JSON.parse(saved) as Record<string, string>)) memory.set(k, v);
    } catch { /* 無痕模式等讀不到就算了 */ }
    const persist = () => {
      try {
        const entries = [...memory.entries()].slice(-3000);
        localStorage.setItem(CACHE_KEY(locale), JSON.stringify(Object.fromEntries(entries)));
      } catch { /* 容量滿或被擋就不存 */ }
    };

    const needs = (text: string) => {
      if (!HAN.test(text)) return false;
      // 日文本來就有漢字：有假名的視為已經是日文
      if (locale === "ja" && KANA.test(text)) return false;
      return true;
    };

    const skipped = (el: Element | null) => {
      for (let e = el; e; e = e.parentElement) if (SKIP_TAGS.has(e.tagName)) return true;
      return !!el?.closest(SKIP_SELECTOR);
    };

    let convert: ((s: string) => string) | null = null;
    const failed = new Set<string>();
    const queue = new Set<string>();
    let inflight = false;

    const translateText = (raw: string): string | null => {
      const core = raw.trim();
      if (!core || !needs(core)) return null;
      if (locale !== "zh-CN" && core.length > MAX_LEN) return null;
      let out: string | undefined;
      if (locale === "zh-CN") out = convert ? convert(core) : undefined;
      else out = memory.get(core);
      if (out === undefined) {
        if (locale !== "zh-CN" && !failed.has(core)) queue.add(core);
        return null;
      }
      if (out === core) return null;
      return raw.replace(core, out);
    };

    const visitText = (node: Text) => {
      const value = node.nodeValue ?? "";
      if (applied.get(node) === value) return;
      if (skipped(node.parentElement)) return;
      const next = translateText(value);
      if (next != null && next !== value) {
        node.nodeValue = next;
        applied.set(node, next);
      }
    };

    const visitAttrs = (el: Element) => {
      if (skipped(el)) return;
      for (const name of ATTRS) {
        const value = el.getAttribute(name);
        if (!value) continue;
        const done = appliedAttr.get(el);
        if (done?.get(name) === value) continue;
        const next = translateText(value);
        if (next != null && next !== value) {
          el.setAttribute(name, next);
          (done ?? appliedAttr.set(el, new Map()).get(el)!).set(name, next);
        }
      }
    };

    const walk = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) return visitText(root as Text);
      if (root.nodeType !== Node.ELEMENT_NODE) return;
      const el = root as Element;
      if (skipped(el)) return;
      visitAttrs(el);
      const tw = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
      for (let n = tw.nextNode(); n; n = tw.nextNode()) {
        if (n.nodeType === Node.TEXT_NODE) visitText(n as Text);
        else visitAttrs(n as Element);
      }
    };

    const fixTitle = () => {
      const next = translateText(document.title);
      if (next) document.title = next;
    };

    const flush = async () => {
      if (inflight || queue.size === 0 || cancelled) return;
      inflight = true;
      const texts = [...queue].slice(0, 60);
      texts.forEach((t) => queue.delete(t));
      try {
        const res = await fetch("/api/i18n/ui", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale, texts }),
        });
        if (res.ok) {
          const { translations } = (await res.json()) as { translations: Record<string, string> };
          for (const t of texts) {
            if (translations[t]) memory.set(t, translations[t]);
            else failed.add(t); // 這次沒翻到就不再重送，下次換頁或重整再試
          }
          persist();
          if (!cancelled) { walk(document.body); fixTitle(); }
        } else {
          texts.forEach((t) => failed.add(t));
        }
      } catch {
        texts.forEach((t) => failed.add(t));
      } finally {
        inflight = false;
        if (queue.size) schedule();
      }
    };

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { void flush(); }, 250);
    };

    const start = () => {
      if (cancelled) return;
      walk(document.body);
      fixTitle();
      schedule();
      observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === "characterData") visitText(m.target as Text);
          else if (m.type === "attributes") visitAttrs(m.target as Element);
          else m.addedNodes.forEach(walk);
        }
        if (queue.size) schedule();
      });
      observer.observe(document.body, {
        subtree: true, childList: true, characterData: true,
        attributes: true, attributeFilter: [...ATTRS],
      });
      const titleEl = document.querySelector("title");
      if (titleEl) observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
    };

    // 頁面串流進來的區塊還在 hydrate 時改文字，React 會報 hydration mismatch。
    // 等 load 之後、瀏覽器空閒才開始。
    let idleId: number | null = null;
    const whenSettled = (fn: () => void) => {
      const go = () => {
        if (typeof window.requestIdleCallback === "function") idleId = window.requestIdleCallback(fn, { timeout: 1500 });
        else timer = setTimeout(fn, 300);
      };
      if (document.readyState === "complete") go();
      else window.addEventListener("load", go, { once: true });
    };

    if (locale === "zh-CN") {
      // 只有簡體使用者才下載 OpenCC 字表（約 100 KB）
      import("@/lib/zh-convert")
        .then(({ toSimplified }) => { convert = toSimplified; whenSettled(start); })
        .catch(() => {});
    } else {
      whenSettled(start);
    }

    return () => {
      cancelled = true;
      if (idleId != null && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idleId);
      observer?.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [locale]);

  return null;
}
