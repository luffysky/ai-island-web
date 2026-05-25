"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MessageSquare, Plus, Users, Hash } from "lucide-react";
import { ForumSearch } from "@/components/forum/ForumSearch";
import { Sparkles as SparklesParticles } from "@/components/ui/Sparkles";

export function ForumClient({
  categories,
  byCategory,
  countByBoard,
  totalThreads,
}: {
  categories: readonly string[];
  byCategory: Record<string, any[]>;
  countByBoard: Record<string, number>;
  totalThreads: number;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <SparklesParticles count={10} colors={["#06b6d4", "#a855f7", "#10b981"]} />
      <div className="absolute inset-0 opacity-25 pointer-events-none">
        <div className="absolute top-32 left-1/4 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-32 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-between flex-wrap gap-3 mb-8"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold flex items-center gap-2 tracking-tight">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/30">
                <MessageSquare size={20} className="text-white" />
              </span>
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">討論區</span>
            </h1>
            <p className="text-fg-muted mt-1 text-sm flex items-center gap-3 flex-wrap">
              <span>提問、分享、交流——AI 島的學習社群</span>
              <span className="inline-flex items-center gap-1 text-xs">
                <Hash size={11} className="text-fg-muted" /> {totalThreads} 則討論
              </span>
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              href="/forum/new"
              className="px-4 py-2 rounded-full bg-gradient-to-r from-accent to-accent-2 text-black font-bold text-sm inline-flex items-center gap-1 shadow-lg shadow-accent/20"
            >
              <Plus size={16} /> 發表主題
            </Link>
          </motion.div>
        </motion.div>

        {/* 搜尋 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <ForumSearch />
        </motion.div>

        {/* 按分類列出版塊 */}
        <div className="space-y-8 mt-8">
          {categories.map((cat, catIdx) => {
            const list = byCategory[cat];
            if (!list || list.length === 0) return null;
            return (
              <motion.section
                key={cat}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ delay: 0.1 * catIdx, duration: 0.4 }}
              >
                <h2 className="text-xs font-bold text-fg-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-6 h-px bg-gradient-to-r from-accent/50 to-transparent" />
                  {cat}
                </h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {list.map((b: any, idx: number) => (
                    <motion.div
                      key={b.id}
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: "-50px" }}
                      transition={{ delay: idx * 0.05 + 0.1 * catIdx, duration: 0.35 }}
                      whileHover={{ y: -3 }}
                    >
                      <Link
                        href={`/forum/${b.slug}`}
                        className="group rounded-2xl border border-border bg-bg-card/80 backdrop-blur p-4 hover:border-accent/50 hover:shadow-xl transition-all flex items-start gap-3 relative overflow-hidden"
                      >
                        <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-accent/0 group-hover:bg-accent/10 blur-2xl transition-all duration-500" />
                        <span className="text-2xl group-hover:scale-110 transition-transform relative">{b.emoji}</span>
                        <div className="min-w-0 flex-1 relative">
                          <h3 className="font-bold group-hover:text-accent transition-colors">{b.name}</h3>
                          <p className="text-xs text-fg-muted line-clamp-1 mt-0.5">{b.description}</p>
                          <div className="text-[11px] text-fg-muted mt-1 inline-flex items-center gap-2">
                            <span className="inline-flex items-center gap-0.5">
                              <Users size={9} />
                              {countByBoard[b.id] ?? 0} 則討論
                            </span>
                            {b.post_role === "admin" && <span className="text-yellow-500">🔒 限管理員發文</span>}
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
