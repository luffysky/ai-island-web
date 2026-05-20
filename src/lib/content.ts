import { Chapter } from './types';
import fs from 'fs';
import path from 'path';

// 讀單一章節
export async function getChapter(id: number): Promise<Chapter | null> {
  const filePath = path.join(process.cwd(), 'src/data/chapters', `ch${String(id).padStart(2, '0')}.json`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

// 讀全部章節（給首頁地圖用）
export async function getAllChapters(): Promise<Chapter[]> {
  const dir = path.join(process.cwd(), 'src/data/chapters');
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort();
  return files.map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8')));
}

// 讀章節 meta（不含 lessons 內容、首頁用、省 token）
export async function getChapterMetas() {
  const chapters = await getAllChapters();
  return chapters.map(c => ({
    id: c.id, slug: c.slug, stage: c.stage,
    title: c.title, subtitle: c.subtitle, icon: c.icon,
    description: c.description, status: c.status,
    difficulty: c.difficulty, estimatedHours: c.estimatedHours,
    lessonCount: c.lessons?.length ?? 0,
    boss: c.boss,
  }));
}
