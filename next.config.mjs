import withBundleAnalyzer from '@next/bundle-analyzer';

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
    const securityHeaders = [
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      // 關掉用不到的高風險能力 + opt-out FLoC；之後做 mock-interview 要用麥克風再放寬
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
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
    ],
  },
};

export default bundleAnalyzer(nextConfig);
