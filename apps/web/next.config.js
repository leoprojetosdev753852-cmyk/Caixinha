/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@caixinhas/shared'],
  experimental: {
    typedRoutes: true,
  },
};

module.exports = nextConfig;
