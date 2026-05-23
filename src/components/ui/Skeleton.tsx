/**
 * 通用 Skeleton 元件 — 為各 route 的 loading.tsx 提供一致的骨架塊。
 * 純 CSS animate-pulse、無依賴。
 */
export function Skeleton({
  className = "",
  width,
  height,
  rounded = "lg",
  style,
}: {
  className?: string;
  width?: number | string;
  height?: number | string;
  rounded?: "sm" | "md" | "lg" | "full";
  style?: React.CSSProperties;
}) {
  const roundedMap = {
    sm: "rounded",
    md: "rounded-md",
    lg: "rounded-lg",
    full: "rounded-full",
  };
  return (
    <div
      className={`bg-bg-card ${roundedMap[rounded]} animate-pulse ${className}`}
      style={{ width, height, ...style }}
    />
  );
}

export function SkeletonText({ lines = 1, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={12}
          width={i === lines - 1 && lines > 1 ? "70%" : "100%"}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-bg-card p-4 ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <Skeleton width={40} height={40} rounded="full" />
        <div className="flex-1 space-y-2">
          <Skeleton height={12} width="60%" />
          <Skeleton height={10} width="40%" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
}
