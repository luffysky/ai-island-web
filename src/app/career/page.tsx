import { CareerPathSection } from "@/components/home/CareerPathSection";

export default function CareerIndexPage() {
  return (
    <div>
      <div className="max-w-6xl mx-auto px-6 py-12 text-center">
        <h1 className="text-3xl font-bold mb-2">🎯 6 大職業路線</h1>
        <p className="text-fg-muted">選一條最符合你目標的路、最短時間最快上場</p>
      </div>
      <CareerPathSection />
    </div>
  );
}
