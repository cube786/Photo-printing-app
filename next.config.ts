import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable dev tools in production
  productionBrowserSourceMaps: false,
  // Remove console.logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // Disable dev indicators completely - set to false to hide all dev overlays
  devIndicators: false,
  // Enable strict mode
  reactStrictMode: true,
  // Allow external images used in the app (Cloudinary + Unsplash)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
