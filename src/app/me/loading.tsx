import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
      {/* Sidebar */}
      <aside className="hidden lg:block space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} height={32} />
        ))}
      </aside>

      {/* Main */}
      <div className="space-y-6">
        {/* Hero card */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-5">
          <div className="flex items-center gap-4">
            <Skeleton width={64} height={64} rounded="full" />
            <div className="flex-1 space-y-2">
              <Skeleton height={18} width="40%" />
              <Skeleton height={12} width="30%" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height={60} />
            ))}
          </div>
        </div>

        {/* Daily checkin */}
        <Skeleton height={140} />

        {/* Recent activity */}
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={56} />
          ))}
        </div>
      </div>
    </div>
  );
}
