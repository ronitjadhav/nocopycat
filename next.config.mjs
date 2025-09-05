/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/nocopycat',
  trailingSlash: true,
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;
