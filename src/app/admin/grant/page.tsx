import { GrantHubClient } from "./GrantHubClient";

export const dynamic = "force-dynamic";

// 補助 & 競賽作戰室（後台限定；內容由 /api/admin/grant 提供、requireAdmin 守門）
export default function AdminGrantPage() {
  return <GrantHubClient />;
}
