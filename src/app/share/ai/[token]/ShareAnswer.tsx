"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

/** 分享落地頁的完整回答（markdown 渲染，撐完整內容、不截斷）。 */
export function ShareAnswer({ answer }: { answer: string }) {
  return (
    <div className="prose-custom prose-sm sm:prose-base max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
        {answer}
      </ReactMarkdown>
    </div>
  );
}
