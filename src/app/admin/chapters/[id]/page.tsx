import { getChapter } from "@/lib/content";
import { notFound } from "next/navigation";
import { ChapterEditor } from "./ChapterEditor";

export default async function AdminChapterEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chapter = await getChapter(Number(id));
  if (!chapter) notFound();
  return <ChapterEditor chapter={chapter} />;
}
