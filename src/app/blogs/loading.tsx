import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <Skeleton height={32} width="30%" className="mb-2" />
      <Skeleton height={14} width="55%" className="mb-6" />
      <Skeleton height={40} width="100%" className="mb-6" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-4 rounded-xl border border-border bg-bg-card"
          >
            <Skeleton width={48} height={48} rounded="full" />
            <div className="flex-1 space-y-2">
              <Skeleton height={14} width="50%" />
              <Skeleton height={10} width="70%" />
              <Skeleton height={10} width="40%" />
            </div>
            <Skeleton width={80} height={28} rounded="md" />
          </div>
        ))}
      </div>
    </div>
  );
}
