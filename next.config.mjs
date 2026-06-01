/** @type {import('next').NextConfig} */
const nextConfig = {
  // 產出精簡的 standalone server（.next/standalone）、大幅縮小 Docker image
  output: 'standalone',
  reactStrictMode: true,
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

export default nextConfig;
