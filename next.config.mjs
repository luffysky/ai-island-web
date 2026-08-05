import withBundleAnalyzer from '@next/bundle-analyzer';
import createNextIntlPlugin from 'next-intl/plugin';

// i18n（cookie 選語言、無 [locale] 路由）→ 讀 src/i18n/request.ts
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// 跑 `ANALYZE=true npm run build` 才開分析（平常 build 零影響）；用來抓 /pricing 等肥包來源
const bundleAnalyzer = withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 產出精簡的 standalone server（.next/standalone）、大幅縮小 Docker image
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false, // 不洩漏框架版本
  // barrel 套件改成 per-export tree-shake（lucide / framer-motion 尤其有感、瘦 client bundle）
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'recharts',
      'date-fns',
      '@tiptap/react',
      '@tiptap/starter-kit',
    ],
  },
  // 全站安全 headers（B3）：HSTS + 防點擊劫持 + 防 MIME 嗅探 + Referrer 收斂
  async headers() {
    // CSP —— 先上 Report-Only（§7.1）：瀏覽器只「回報」違規、不擋任何東西，
    // 完全不會弄壞站。目的是先在 console/report 觀察哪些來源會被擋，再逐步收斂到 enforce。
    // 收斂路線：確認乾淨後，把 header key 改成 'Content-Security-Policy'（去掉 -Report-Only）、
    // 並把 script-src 的 'unsafe-inline'/'unsafe-eval' 換成 nonce（需 middleware 注入）。
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",                 // 禁用 <object>/<embed>（老式 XSS 面）
      "frame-ancestors 'self'",            // 等同 X-Frame-Options、防點擊劫持
      "form-action 'self'",                // 表單只能送同源
      "img-src 'self' data: blob: https:", // 上傳圖/OG/avatar 走 https + data/blob
      "font-src 'self' data: https://fonts.gstatic.com",   // 自架字體 + Google Fonts 供檔
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com", // Tailwind/內聯 + Google Fonts CSS
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next 內聯 bootstrap；之後改 nonce
      "connect-src 'self' https: wss:",    // API/Supabase/AI/WS；收斂時改列明確網域
      "media-src 'self' data: blob: https:",
      "worker-src 'self' blob:",           // service worker / web worker
      "manifest-src 'self'",
    ].join('; ');

    const securityHeaders = [
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      // 關掉用不到的高風險能力 + opt-out FLoC；microphone=(self) 開放同源（AI 聊天語音輸入要用）
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(), browsing-topics=()' },
      // Report-Only：只回報不阻擋（安全上線、觀察後再收斂為 enforce）
      { key: 'Content-Security-Policy-Report-Only', value: csp },
    ];
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.jsdelivr.net' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }, // Google OAuth avatar
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' }, // GitHub OAuth avatar
      { protocol: 'https', hostname: 'gravatar.com' },
      { protocol: 'https', hostname: 'www.gravatar.com' },
      { protocol: 'https', hostname: '*.r2.dev' }, // Cloudflare R2 公開圖（上傳的封面/附件靠這顯示）
    ],
  },
};

export default withNextIntl(bundleAnalyzer(nextConfig));
