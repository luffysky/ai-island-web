"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;
  return (
    <div className="fixed bottom-0 inset-x-0 z-[60] bg-amber-500 text-black text-center text-xs py-1.5 flex items-center justify-center gap-1.5 shadow-lg">
      <WifiOff size={12} /> 你目前離線，顯示的是已快取 / 已存離線的內容
    </div>
  );
}
