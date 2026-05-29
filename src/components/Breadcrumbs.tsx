"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { buildBreadcrumbs } from "@/lib/breadcrumb-routes";

/**
 * 全站麵包屑（學員 + 後台共用）
 *
 * 林董：「整個網站包括後台 都做麵包屑」
 *
 * 用法：放在 layout 內、自動從 pathname 推導
 * 隱藏路徑：首頁本身、login / signup（無意義）
 */
const HIDE_ON: string[] = ["/", "/login", "/signup", "/auth/callback", "/auth/line"];

export function Breadcrumbs({ className = "" }: { className?: string }) {
  const pathname = usePathname() || "/";
  if (HIDE_ON.some((p) => pathname === p)) return null;

  const crumbs = buildBreadcrumbs(pathname);
  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="麵包屑" className={`text-xs text-fg-muted flex items-center gap-1 flex-wrap py-2 px-4 sm:px-6 ${className}`}>
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={i} className="inline-flex items-center gap-1 min-w-0">
            {c.href && !isLast ? (
              <Link href={c.href as any} className="hover:text-accent transition truncate max-w-[180px]">
                {c.label}
              </Link>
            ) : (
              <span className={`truncate max-w-[200px] ${isLast ? "text-fg font-medium" : ""}`} aria-current={isLast ? "page" : undefined}>
                {c.label}
              </span>
            )}
            {!isLast && <ChevronRight size={11} className="text-fg-muted/60 shrink-0" />}
          </span>
        );
      })}
    </nav>
  );
}
