import { redirect } from "next/navigation";

// 舊路徑、統一導向新的 /me 學習後台
export default function DashboardPage() {
  redirect("/me");
}
