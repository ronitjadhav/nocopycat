/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/nocopycat',
  assetPrefix: '/nocopycat/',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
