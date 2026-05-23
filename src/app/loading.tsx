import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <div className="space-y-3">
        <Skeleton height={28} width="40%" />
        <Skeleton height={14} width="65%" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} height={120} />
        ))}
      </div>
    </div>
  );
}
