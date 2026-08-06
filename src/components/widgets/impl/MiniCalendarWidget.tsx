"use client";
// mini_calendar widget：直接複用 /daily 的農民曆 CalendarWidget（國曆格+農曆+西元/民國年+節氣+月相）。
import { CalendarWidget } from "@/components/daily/CalendarWidget";

export default function MiniCalendarWidget() {
  return (
    <div className="h-full overflow-auto">
      <CalendarWidget />
    </div>
  );
}
