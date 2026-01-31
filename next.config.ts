import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: 'assets.icanet.se' },
      { hostname: 'images.arla.com' },
      { hostname: 'img.tasteline.com' },
      { hostname: 'imgs.search.brave.com' },
      { hostname: '*.tasteline.com' },
    ],
  },
};

export default nextConfig;
