import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="space-y-2">
        <Skeleton height={32} width="30%" />
        <Skeleton height={14} width="55%" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-bg-card overflow-hidden">
            <Skeleton height={140} className="!rounded-none" />
            <div className="p-4 space-y-2">
              <Skeleton height={16} width="70%" />
              <Skeleton height={10} width="90%" />
              <Skeleton height={10} width="80%" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
