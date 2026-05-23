import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Author header */}
      <div className="flex items-center gap-4 mb-8">
        <Skeleton width={72} height={72} rounded="full" />
        <div className="flex-1 space-y-2">
          <Skeleton height={20} width="40%" />
          <Skeleton height={12} width="60%" />
        </div>
      </div>

      {/* Article cards */}
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-bg-card p-5">
            <div className="flex gap-4">
              <Skeleton width={120} height={80} className="flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton height={16} width="80%" />
                <Skeleton height={12} width="100%" />
                <Skeleton height={12} width="65%" />
                <div className="flex gap-2 pt-1">
                  <Skeleton height={18} width={50} rounded="full" />
                  <Skeleton height={18} width={60} rounded="full" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
