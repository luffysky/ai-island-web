import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { getDueReviews } from "@/lib/srs";
import { ReviewClient } from "./ReviewClient";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const reviews = await getDueReviews(user.id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">錯題複習</h1>
        <p className="text-sm text-fg-muted mt-1">
          答錯的測驗會用間隔重複（Anki 式）排程、到期就在這裡再考你一次。答對往後延、答錯明天再來。
        </p>
      </header>
      <ReviewClient initialReviews={reviews} />
    </div>
  );
}
