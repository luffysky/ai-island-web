"use client";

import { cn } from "@/lib/utils";

/**
 * Aceternity 風 spotlight — 滑鼠跟隨光暈
 */
export function Spotlight({
  className,
  fill = "white",
}: {
  className?: string;
  fill?: string;
}) {
  return (
    <svg
      className={cn(
        "pointer-events-none absolute inset-0 h-[120%] w-full -top-10 opacity-50 spotlight-pulse",
        className,
      )}
      viewBox="0 0 3787 2842"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid slice"
    >
      <g filter="url(#spotlight-filter)">
        <ellipse
          cx="1924"
          cy="273"
          rx="1924"
          ry="273"
          transform="matrix(-0.822 -0.569 -0.569 0.822 3631 2291)"
          fill={fill}
          fillOpacity="0.21"
        />
      </g>
      <defs>
        <filter
          id="spotlight-filter"
          x="0.86"
          y="0.86"
          width="3786"
          height="2840"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="151" result="effect1" />
        </filter>
      </defs>
      <style jsx>{`
        :global(.spotlight-pulse) {
          animation: spotlight-anim 7s ease-in-out infinite;
        }
        @keyframes spotlight-anim {
          0%, 100% { opacity: 0.5; transform: translateX(0); }
          50% { opacity: 0.8; transform: translateX(50px); }
        }
      `}</style>
    </svg>
  );
}
