import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 min-w-0">
      {/* Hero */}
      <header className="mb-10 space-y-3">
        <Skeleton height={12} width="30%" />
        <Skeleton height={36} width="80%" />
        <Skeleton height={20} width="55%" />
        <Skeleton height={14} width="90%" className="mt-4" />
        <Skeleton height={14} width="75%" />

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={64} />
          ))}
        </div>

        {/* Progress */}
        <Skeleton height={80} className="mt-2" />

        {/* Outcomes */}
        <Skeleton height={140} className="mt-2" />
      </header>

      {/* Lesson list */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} height={120} />
        ))}
      </div>
    </div>
  );
}
