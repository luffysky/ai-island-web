/** 呼吸燈圓點（即時/在線指示）。純 CSS、無狀態。 */
export function PulseDot({ color = "#22c55e", size = 8, className = "" }: { color?: string; size?: number; className?: string }) {
  return (
    <span className={`relative inline-flex shrink-0 ${className}`} style={{ width: size, height: size }} aria-hidden>
      <span className="absolute inset-0 rounded-full animate-ping" style={{ background: color, opacity: 0.5 }} />
      <span className="absolute inset-0 rounded-full" style={{ background: color }} />
    </span>
  );
}
