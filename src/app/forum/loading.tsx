import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Skeleton height={32} width="25%" className="mb-2" />
      <Skeleton height={14} width="50%" className="mb-6" />

      {/* Board tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} height={32} width={Math.floor(60 + Math.random() * 40)} rounded="full" />
        ))}
      </div>

      {/* Thread list */}
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-card)]"
          >
            <Skeleton width={36} height={36} rounded="full" />
            <div className="flex-1 space-y-2">
              <Skeleton height={14} width="60%" />
              <Skeleton height={10} width="40%" />
            </div>
            <div className="flex flex-col items-end gap-1">
              <Skeleton width={32} height={12} />
              <Skeleton width={48} height={10} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
