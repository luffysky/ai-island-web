"use client";

/**
 * 寵物對話泡泡 — 兩個版本：
 *   - PlainBubble：一般使用者、樸素風
 *   - CuteBubble：luffy / nami 用、粉色漸層 + 愛心 + sparkle
 *
 * 兩者都 absolute 定位、由 Pet.tsx 控制位置。
 */

export function PlainBubble({ text }: { text: string }) {
  return (
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
      {text}
    </div>
  );
}

export function CuteBubble({ text }: { text: string }) {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: "115%",
        transform: "translateX(-50%)",
        background:
          "linear-gradient(135deg, #ffe0ec 0%, #ffd1e3 40%, #ffc4dc 100%)",
        border: "1.5px solid #ff9ec0",
        borderRadius: 14,
        padding: "5px 14px 5px 12px",
        fontSize: 12,
        whiteSpace: "nowrap",
        color: "#7a1d3d",
        fontWeight: 500,
        boxShadow:
          "0 4px 12px rgba(255, 158, 192, 0.4), 0 0 0 2px rgba(255, 255, 255, 0.6) inset",
      }}
      className="cute-bubble"
    >
      {/* 左上小愛心 */}
      <span
        style={{
          position: "absolute",
          top: -6,
          left: -4,
          fontSize: 10,
          filter: "drop-shadow(0 0 2px #ff9ec0)",
        }}
      >
        💗
      </span>
      {/* 右上小愛心 */}
      <span
        style={{
          position: "absolute",
          top: -4,
          right: -2,
          fontSize: 8,
        }}
      >
        ✨
      </span>
      {/* 文字內容、前面加小裝飾 */}
      <span style={{ marginRight: 2 }}>♡</span>
      {text}
      <span style={{ marginLeft: 2 }}>♡</span>
      {/* 底部尖角愛心尾巴 */}
      <span
        style={{
          position: "absolute",
          left: "50%",
          bottom: -8,
          transform: "translateX(-50%)",
          fontSize: 10,
        }}
      >
        💗
      </span>

      <style jsx>{`
        :global(.cute-bubble) {
          animation: cute-pop 280ms ease-out;
        }
        :global(.cute-bubble)::after {
          content: "";
          position: absolute;
          inset: -1px;
          border-radius: 14px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.4) 50%,
            transparent 100%
          );
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask: linear-gradient(#000 0 0) content-box,
            linear-gradient(#000 0 0);
          mask-composite: exclude;
          -webkit-mask-composite: xor;
          pointer-events: none;
          animation: cute-shimmer 3.2s ease-in-out infinite;
          opacity: 0.7;
        }
        @keyframes cute-pop {
          0% {
            transform: translateX(-50%) scale(0.7);
            opacity: 0;
          }
          70% {
            transform: translateX(-50%) scale(1.06);
            opacity: 1;
          }
          100% {
            transform: translateX(-50%) scale(1);
            opacity: 1;
          }
        }
        @keyframes cute-shimmer {
          0%,
          100% {
            background-position: -200% 0;
          }
          50% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </div>
  );
}
