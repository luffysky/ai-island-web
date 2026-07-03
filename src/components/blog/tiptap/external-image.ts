import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

/**
 * 貼上/拖入外部圖片（別的網站的 <img src>）→ 自動抓回來重傳 R2、把 src 換成自家網址，
 * 避免外站圖之後失效（連結腐爛）。
 *
 * 作法：一個 PM plugin 監看 doc，掃到「外部 src 的 image 節點」就呼叫 options.upload(src)，
 * 成功後把該節點 src 換成回傳的 R2 網址。每個 src 只嘗試一次（attempted set，防迴圈 / 防 CORS 失敗重試）。
 */

export function isExternalImageSrc(src: string): boolean {
  if (!src) return false;
  if (/^(data:|blob:)/i.test(src)) return false;
  if (!/^https?:\/\//i.test(src)) return false; // 相對路徑 = 自家
  try {
    const u = new URL(src);
    if (typeof window !== "undefined" && u.hostname === window.location.hostname) return false;
    return true;
  } catch {
    return false;
  }
}

export interface ExternalImageOptions {
  upload: (src: string) => Promise<string | null>;
}

export const ExternalImageUpload = Extension.create<ExternalImageOptions>({
  name: "externalImageUpload",

  addOptions() {
    return { upload: async () => null };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    const attempted = new Set<string>();

    return [
      new Plugin({
        key: new PluginKey("externalImageUpload"),
        view() {
          return {
            update(view) {
              const pending: string[] = [];
              view.state.doc.descendants((node) => {
                if (node.type.name === "image") {
                  const src = node.attrs.src as string;
                  if (src && isExternalImageSrc(src) && !attempted.has(src)) pending.push(src);
                }
                return true;
              });
              for (const src of pending) {
                attempted.add(src);
                options
                  .upload(src)
                  .then((newUrl) => {
                    if (!newUrl || newUrl === src) return;
                    let pos = -1;
                    view.state.doc.descendants((n, p) => {
                      if (pos < 0 && n.type.name === "image" && n.attrs.src === src) pos = p;
                      return pos < 0;
                    });
                    if (pos >= 0) {
                      const cur = view.state.doc.nodeAt(pos);
                      if (cur) {
                        const tr = view.state.tr.setNodeMarkup(pos, undefined, { ...cur.attrs, src: newUrl });
                        view.dispatch(tr);
                      }
                    }
                  })
                  .catch(() => {});
              }
            },
          };
        },
      }),
    ];
  },
});
