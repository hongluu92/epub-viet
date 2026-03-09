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
  turbopack: {},
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/.git/**',
          '**/.next/**',
          '**/.claude/**',
          '**/.opencode/**',
          '**/plans/**',
          '**/docs/**',
          '**/node_modules/**',
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
