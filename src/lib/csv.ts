/**
 * Convert array of objects → CSV string.
 * - Comma / quote / newline values are wrapped in double-quotes
 * - Embedded quotes doubled per RFC 4180
 * - Caller is responsible for prepending UTF-8 BOM if Excel-friendly
 */
export function toCsv<T extends Record<string, any>>(
  rows: T[],
  columns: { key: keyof T; header: string }[],
): string {
  const header = columns.map((c) => escape(c.header)).join(",");
  const lines = rows.map((row) =>
    columns
      .map((c) => {
        const v = row[c.key];
        if (v === null || v === undefined) return "";
        if (typeof v === "object") return escape(JSON.stringify(v));
        return escape(String(v));
      })
      .join(","),
  );
  return [header, ...lines].join("\n");
}

function escape(s: string): string {
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export const UTF8_BOM = "﻿";
