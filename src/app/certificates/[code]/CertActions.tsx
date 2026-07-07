"use client";

import { useState } from "react";
import { ImageDown, FileDown, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

/** 證書下載：圖片(PNG，用 OG 卡)＋ PDF(瀏覽器列印/另存 PDF，只印證書卡)。 */
export function CertActions({ ogImageUrl, fileBase }: { ogImageUrl: string; fileBase: string }) {
  const t = useTranslations("certificates");
  const [busy, setBusy] = useState(false);

  async function downloadImage() {
    setBusy(true);
    try {
      const res = await fetch(ogImageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${fileBase}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(ogImageUrl, "_blank");
    } finally { setBusy(false); }
  }

  function downloadPdf() {
    // 用瀏覽器列印 → 另存為 PDF（print CSS 只顯示證書卡）
    window.print();
  }

  return (
    <>
      {/* 只印證書卡的列印樣式 */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #cert-card, #cert-card * { visibility: visible !important; }
          #cert-card { position: absolute; inset: 0 auto auto 0; width: 100%; margin: 0; box-shadow: none; }
          .cert-no-print { display: none !important; }
        }
      `}</style>
      <button onClick={downloadImage} disabled={busy}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border hover:bg-bg-elevated transition disabled:opacity-50">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <ImageDown size={16} />} {t("downloadImage")}
      </button>
      <button onClick={downloadPdf}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border hover:bg-bg-elevated transition">
        <FileDown size={16} /> {t("downloadPdf")}
      </button>
    </>
  );
}
