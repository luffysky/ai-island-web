import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="space-y-2">
        <Skeleton height={32} width="35%" />
        <Skeleton height={14} width="60%" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton width={32} height={32} rounded="full" />
              <Skeleton height={16} width="50%" />
            </div>
            <Skeleton height={10} width="100%" />
            <Skeleton height={10} width="85%" />
            <div className="flex gap-2 pt-2">
              <Skeleton height={20} width={50} rounded="full" />
              <Skeleton height={20} width={50} rounded="full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
