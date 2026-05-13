/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/sheep";

const nextConfig = {
  typedRoutes: false,
  basePath,
  assetPrefix: basePath
};

export default nextConfig;
