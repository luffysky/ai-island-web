import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Thread header */}
      <div className="mb-6 space-y-3">
        <Skeleton height={12} width="25%" />
        <Skeleton height={28} width="75%" />
        <div className="flex items-center gap-3 pt-2">
          <Skeleton width={32} height={32} rounded="full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton height={12} width="30%" />
            <Skeleton height={10} width="20%" />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="space-y-2 mb-6">
        <Skeleton height={12} />
        <Skeleton height={12} />
        <Skeleton height={12} width="80%" />
        <Skeleton height={12} width="65%" />
      </div>

      {/* Reactions */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} width={42} height={26} rounded="full" />
        ))}
      </div>

      {/* Reply list */}
      <Skeleton height={18} width="20%" className="mb-3" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-card)] p-3">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton width={28} height={28} rounded="full" />
              <Skeleton height={10} width={100} />
            </div>
            <Skeleton height={10} width="90%" />
            <Skeleton height={10} width="70%" className="mt-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
