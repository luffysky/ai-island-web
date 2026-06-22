"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!show) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="回到頂部"
      className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-accent text-black shadow-lg flex items-center justify-center hover:scale-110 transition"
    >
      <ArrowUp size={18} />
    </button>
  );
}
