import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** /verify/<code> → 導到證書頁（對外驗證用的友善別名）。 */
export default async function VerifyRedirect({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  redirect(`/certificates/${encodeURIComponent(code)}`);
}
