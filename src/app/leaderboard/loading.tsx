import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="space-y-2">
        <Skeleton height={32} width="40%" />
        <Skeleton height={14} width="60%" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-bg-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <Skeleton width={48} height={48} rounded="full" />
              <div className="flex-1 space-y-2">
                <Skeleton height={14} width="60%" />
                <Skeleton height={10} width="40%" />
              </div>
            </div>
            <Skeleton height={10} width="80%" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
            <Skeleton width={24} height={14} />
            <Skeleton width={32} height={32} rounded="full" />
            <div className="flex-1 space-y-2">
              <Skeleton height={12} width="40%" />
              <Skeleton height={10} width="25%" />
            </div>
            <Skeleton width={60} height={12} />
          </div>
        ))}
      </div>
    </div>
  );
}
