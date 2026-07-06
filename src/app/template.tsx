"use client";

import { motion } from "framer-motion";

/**
 * 全站頁面切換轉場。只淡 opacity、不動 transform ——
 * 若用 translate/scale，motion.div 會成為 fixed 子元素的 containing block、
 * 導致頁內浮動元件（綠寶、筆記、側欄）定位跑掉。opacity 沒這問題。
 * reduced-motion 由 globals 的 * 規則把 duration 歸零。
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
