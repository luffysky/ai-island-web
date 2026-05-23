import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <Skeleton height={32} width="35%" className="mb-2" />
      <Skeleton height={14} width="55%" className="mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-bg-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <Skeleton width={36} height={36} rounded="full" />
              <div className="flex-1 space-y-2">
                <Skeleton height={14} width="70%" />
                <Skeleton height={10} width="40%" />
              </div>
            </div>
            <Skeleton height={10} width="100%" />
            <Skeleton height={10} width="85%" className="mt-2" />
            <div className="flex gap-2 mt-3">
              <Skeleton height={20} width={60} rounded="full" />
              <Skeleton height={20} width={50} rounded="full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
