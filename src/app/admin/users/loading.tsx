import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";

export default function Loading() {
  return <AdminPageSkeleton hasStats statsCount={4} hasTable tableRows={10} />;
}
