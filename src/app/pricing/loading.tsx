import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="text-center space-y-3">
        <Skeleton height={32} width="35%" className="mx-auto" />
        <Skeleton height={14} width="55%" className="mx-auto" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-bg-card p-6 space-y-4">
            <Skeleton height={18} width="50%" />
            <Skeleton height={32} width="40%" />
            <Skeleton height={10} width="70%" />
            <div className="space-y-2 pt-2">
              {[1, 2, 3, 4, 5].map((j) => (
                <Skeleton key={j} height={10} width={j === 5 ? "60%" : "85%"} />
              ))}
            </div>
            <Skeleton height={36} />
          </div>
        ))}
      </div>
    </div>
  );
}
