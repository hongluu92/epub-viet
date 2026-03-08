/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/epub-viet',
  env: {
    NEXT_PUBLIC_BASE_PATH: '/epub-viet',
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
