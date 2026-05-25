import { Skeleton } from "@/components/ui/Skeleton";

export function AdminPageSkeleton({
  hasStats = true,
  statsCount = 4,
  hasTable = true,
  tableRows = 6,
  hasChart = false,
}: {
  hasStats?: boolean;
  statsCount?: number;
  hasTable?: boolean;
  tableRows?: number;
  hasChart?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-bg-card p-5">
        <div className="flex items-start gap-3">
          <Skeleton width={40} height={40} rounded="full" />
          <div className="flex-1 space-y-2">
            <Skeleton height={24} width="35%" />
            <Skeleton height={12} width="70%" />
          </div>
        </div>
      </div>

      {hasStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: statsCount }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-bg-card p-4">
              <Skeleton height={10} width="50%" />
              <Skeleton height={24} width="70%" className="mt-2" />
            </div>
          ))}
        </div>
      )}

      {hasChart && (
        <div className="rounded-xl border border-border bg-bg-card p-4">
          <Skeleton height={180} />
        </div>
      )}

      {hasTable && (
        <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
          <div className="grid grid-cols-5 gap-3 px-4 py-3 bg-bg-elevated border-b border-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height={10} />
            ))}
          </div>
          {Array.from({ length: tableRows }).map((_, i) => (
            <div key={i} className="grid grid-cols-5 gap-3 px-4 py-3 border-b border-border last:border-0">
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} height={12} width={j === 0 ? "80%" : "60%"} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
