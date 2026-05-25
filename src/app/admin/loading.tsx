import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";

export default function Loading() {
  return <AdminPageSkeleton hasStats statsCount={8} hasChart hasTable tableRows={8} />;
}
